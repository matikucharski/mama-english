import { h, toast, confirmDialog } from '../ui.js';
import { state, save, exportJSON, importJSON, resetAll, today } from '../store.js';
import { initVoices, englishVoices, speak, sttSupported, ttsSupported } from '../speech.js';

let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });

function toggle(checked, onchange) {
  return h('label', { class: 'switch' },
    h('input', { type: 'checkbox', checked, onchange: (e) => onchange(e.target.checked) }),
    h('span'),
  );
}

export function settingsView() {
  const s = state.settings;
  const voiceSelect = h('select', {
    'aria-label': 'Głos lektora',
    onchange: (e) => { s.voiceURI = e.target.value || null; save(); speak('Good morning, sweetie!'); },
  }, h('option', { value: '' }, 'Automatycznie'));
  initVoices().then(() => {
    for (const v of englishVoices()) {
      voiceSelect.append(h('option', { value: v.voiceURI, selected: v.voiceURI === s.voiceURI }, `${v.name} (${v.lang})`));
    }
  });

  const rateLabel = h('small', {}, `${s.rate.toFixed(2)}×`);
  const fileInput = h('input', {
    type: 'file', accept: 'application/json,.json', hidden: true,
    onchange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        importJSON(await file.text());
        toast('Postęp wczytany ✅');
        location.hash = '#/home';
      } catch (err) {
        toast(`Błąd: ${err.message}`);
      }
    },
  });

  return h('div', {},
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Wstecz', onclick: () => history.back() }, '←'),
      h('h1', {}, 'Ustawienia'),
    ),

    h('div', { class: 'section-title' }, 'Lektor'),
    h('div', { class: 'card', style: { padding: '4px 18px' } },
      !ttsSupported ? h('p', { class: 'muted', style: { padding: '14px 0' } }, 'Ta przeglądarka nie obsługuje lektora. Użyj Chrome.') : null,
      h('div', { class: 'setting' },
        h('label', {}, 'Tempo mówienia', rateLabel),
        h('input', {
          type: 'range', min: '0.5', max: '1.2', step: '0.05', value: String(s.rate),
          oninput: (e) => { s.rate = Number(e.target.value); rateLabel.textContent = `${s.rate.toFixed(2)}×`; },
          onchange: () => { save(); speak('Time to get up, sleepyhead!'); },
        }),
      ),
      h('div', { class: 'setting' }, h('label', {}, 'Głos'), voiceSelect),
      h('div', { class: 'setting' },
        h('label', {}, 'Test'),
        h('button', { class: 'btn sm', onclick: () => speak("Hello! Let's learn some English together.") }, '🔊 Posłuchaj'),
      ),
    ),

    h('div', { class: 'section-title' }, 'Nauka'),
    h('div', { class: 'card', style: { padding: '4px 18px' } },
      h('div', { class: 'setting' },
        h('label', {}, 'Tłumaczenie w dialogach', h('small', {}, 'Pokazuj polski tekst pod angielskim')),
        toggle(s.showPl, (v) => { s.showPl = v; save(); }),
      ),
      h('div', { class: 'setting' },
        h('label', {}, 'Ćwiczenia z mikrofonem 🎤',
          h('small', {}, sttSupported ? 'Aplikacja sprawdza, czy dobrze mówisz (wymaga internetu)' : 'Niedostępne w tej przeglądarce')),
        toggle(s.micEnabled && sttSupported, (v) => { s.micEnabled = v; save(); }),
      ),
      h('div', { class: 'setting' },
        h('label', {}, 'Dzienny cel', h('small', {}, 'Ile zdań/zadań dziennie')),
        h('select', { onchange: (e) => { s.dailyGoal = Number(e.target.value); save(); } },
          [5, 10, 20, 30, 50].map((n) => h('option', { value: n, selected: n === s.dailyGoal }, n))),
      ),
    ),

    installPrompt ? h('div', { class: 'section-title' }, 'Aplikacja') : null,
    installPrompt ? h('div', { class: 'card' },
      h('button', { class: 'btn block', onclick: async () => { await installPrompt.prompt(); installPrompt = null; } }, '📲 Zainstaluj na telefonie'),
    ) : null,

    h('div', { class: 'section-title' }, 'Kopia zapasowa'),
    h('div', { class: 'card stack' },
      h('p', { class: 'small muted' }, 'Postęp jest zapisany tylko na tym telefonie. Zrób czasem kopię – przyda się przy zmianie telefonu.'),
      h('button', {
        class: 'btn ghost block',
        onclick: () => {
          const blob = new Blob([exportJSON()], { type: 'application/json' });
          const a = h('a', { href: URL.createObjectURL(blob), download: `mama-english-${today()}.json` });
          document.body.append(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        },
      }, '💾 Zapisz kopię (plik)'),
      h('button', { class: 'btn ghost block', onclick: () => fileInput.click() }, '📂 Wczytaj kopię'),
      fileInput,
      h('button', {
        class: 'btn bad block',
        onclick: async () => {
          if (!(await confirmDialog('Wyzerować postęp?', 'Wszystkie nauczone zdania, gwiazdki i odznaki zostaną usunięte. Tego nie da się cofnąć.', 'Tak, wyzeruj'))) return;
          resetAll();
          toast('Postęp wyzerowany');
          location.hash = '#/home';
        },
      }, '🗑️ Wyzeruj postęp'),
    ),
    h('p', { class: 'small muted center', style: { marginTop: '24px' } }, 'Mama English · v1.0'),
  );
}
