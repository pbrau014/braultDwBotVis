'use strict';
(() => {
  const targets = document.querySelectorAll('[data-help]');
  for (const target of targets) {
    const message = String(target.getAttribute('data-help') || '').trim();
    if (!message) continue;
    const id = 'help-' + Math.random().toString(36).slice(2, 10);
    const tip = document.createElement('span');
    tip.className = 'help-tooltip';
    tip.id = id;
    tip.setAttribute('role', 'tooltip');
    tip.setAttribute('aria-hidden', 'true');
    tip.textContent = message;
    target.classList.add('help-tip-target');
    if (!target.matches('button,a,input,select,textarea,[tabindex]')) target.tabIndex = 0;
    const describedBy = (target.getAttribute('aria-describedby') || '').split(/\\s+/).filter(Boolean);
    if (!describedBy.includes(id)) describedBy.push(id);
    target.setAttribute('aria-describedby', describedBy.join(' '));
    target.append(tip);
    const show = () => { tip.classList.add('visible'); tip.setAttribute('aria-hidden', 'false'); };
    const hide = () => { tip.classList.remove('visible'); tip.setAttribute('aria-hidden', 'true'); };
    target.addEventListener('mouseenter', show);
    target.addEventListener('mouseleave', hide);
    target.addEventListener('focus', show);
    target.addEventListener('blur', hide);
    target.addEventListener('keydown', event => { if (event.key === 'Escape') { hide(); target.blur(); } });
  }
})();
