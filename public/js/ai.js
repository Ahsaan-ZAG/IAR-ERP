(function () {
  const form = document.getElementById('aiForm');
  const input = document.getElementById('aiInput');
  const send = document.getElementById('aiSend');
  const messages = document.getElementById('aiMessages');
  const suggestions = document.getElementById('aiSuggestions');

  if (!form || !input || !messages) return;

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function userBubble(text) {
    const wrap = document.createElement('div');
    wrap.className = 'ai-msg ai-user';
    const bubble = document.createElement('div');
    bubble.className = 'ai-bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    scrollToBottom();
  }

  function botBubble(answer) {
    const wrap = document.createElement('div');
    wrap.className = 'ai-msg ai-bot';

    const bubble = document.createElement('div');
    bubble.className = 'ai-bubble ai-kind-' + (answer.kind || 'data');

    const badge = document.createElement('span');
    badge.className = 'ai-badge';
    badge.textContent =
      answer.kind === 'prediction' ? 'ESTIMATE' :
      answer.kind === 'help' ? 'HELP' :
      answer.kind === 'error' ? 'ERROR' :
      answer.kind === 'greeting' ? 'HELLO' :
      answer.kind === 'fallback' ? 'TIP' : 'DATA';
    bubble.appendChild(badge);

    if (answer.title) {
      const h = document.createElement('div');
      h.className = 'ai-title';
      h.textContent = answer.title;
      bubble.appendChild(h);
    }

    if (answer.text) {
      const p = document.createElement('div');
      p.className = 'ai-text';
      p.textContent = answer.text;
      bubble.appendChild(p);
    }

    if (Array.isArray(answer.bullets) && answer.bullets.length > 0) {
      const ul = document.createElement('ul');
      ul.className = 'ai-list';
      answer.bullets.forEach(b => {
        const li = document.createElement('li');
        li.textContent = b;
        ul.appendChild(li);
      });
      bubble.appendChild(ul);
    }

    const data = answer.data;
    if (data && Array.isArray(data.rows) && data.rows.length > 0) {
      const table = document.createElement('table');
      table.className = 'ai-table';
      const keys = Object.keys(data.rows[0]);
      const thead = document.createElement('thead');
      const trH = document.createElement('tr');
      keys.forEach(k => {
        const th = document.createElement('th');
        th.textContent = k.replace(/_/g, ' ');
        trH.appendChild(th);
      });
      thead.appendChild(trH);
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      data.rows.forEach(row => {
        const tr = document.createElement('tr');
        keys.forEach(k => {
          const td = document.createElement('td');
          const v = row[k];
          td.textContent =
            v === null || v === undefined ? '—' :
            typeof v === 'number' ? v.toLocaleString() : String(v);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      bubble.appendChild(table);
    }

    if (data && !Array.isArray(data.rows) && typeof data === 'object') {
      const list = document.createElement('ul');
      list.className = 'ai-list';
      Object.keys(data).forEach(k => {
        if (k === 'historical') return;
        const v = data[k];
        if (v === null || v === undefined) return;
        const li = document.createElement('li');
        const label = k.replace(/_/g, ' ');
        li.textContent = label + ': ' +
          (typeof v === 'number' ? v.toLocaleString() : String(v));
        list.appendChild(li);
      });
      if (list.children.length > 0) bubble.appendChild(list);
    }

    if (answer.llm_rephrased) {
      const p = document.createElement('div');
      p.className = 'ai-text ai-llm';
      p.textContent = '✨ ' + answer.llm_rephrased;
      bubble.appendChild(p);
    }

    if (Array.isArray(answer.suggestions) && answer.suggestions.length > 0) {
      const box = document.createElement('div');
      box.className = 'ai-suggestions-inline';
      answer.suggestions.forEach(s => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ai-chip';
        btn.textContent = s;
        btn.addEventListener('click', () => sendQuestion(s));
        box.appendChild(btn);
      });
      bubble.appendChild(box);
    }

    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    scrollToBottom();
  }

  async function sendQuestion(text) {
    const q = String(text || '').trim();
    if (!q) return;

    userBubble(q);
    input.value = '';
    send.disabled = true;
    send.textContent = '…';

    try {
      const url = '/ai/ask?q=' + encodeURIComponent(q);
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (!res.ok) {
        botBubble({ kind: 'error', title: 'Error', text: json.error || 'Something went wrong.' });
      } else {
        botBubble(json);
      }
    } catch (err) {
      botBubble({ kind: 'error', title: 'Network error', text: 'Could not reach the assistant.' });
    } finally {
      send.disabled = false;
      send.textContent = 'Ask';
      input.focus();
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendQuestion(input.value);
  });

  if (suggestions) {
    suggestions.querySelectorAll('.ai-chip').forEach(btn => {
      btn.addEventListener('click', () => sendQuestion(btn.dataset.q));
    });
  }
})();