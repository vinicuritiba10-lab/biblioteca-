// ===== TOAST NOTIFICATION SYSTEM =====
// Substitui os alert() do navegador por notificações bonitas

(function() {
    const ICONS = {
        success: '✅',
        error:   '❌',
        info:    'ℹ️',
        warning: '⚠️'
    };

    function getOrCreateContainer() {
        let c = document.getElementById('toast-container');
        if (!c) {
            c = document.createElement('div');
            c.id = 'toast-container';
            document.body.appendChild(c);
        }
        return c;
    }

    window.showToast = function(message, type = 'info', duration = 3500) {
        const container = getOrCreateContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.setProperty('--dur', duration + 'ms');

        // limpa emojis duplicados do começo da mensagem
        const limpa = message.replace(/^[✅❌⚠️ℹ️📧🔄]\s*/u, '');

        toast.innerHTML = `<span class="toast-icon">${ICONS[type] || ICONS.info}</span><span>${limpa}</span>`;
        toast.addEventListener('click', () => removeToast(toast));

        container.appendChild(toast);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('show'));
        });

        setTimeout(() => removeToast(toast), duration);
    };

    function removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 350);
    }

    // Atalhos
    window.toastSucesso  = (msg, dur) => showToast(msg, 'success', dur);
    window.toastErro     = (msg, dur) => showToast(msg, 'error', dur);
    window.toastInfo     = (msg, dur) => showToast(msg, 'info', dur);
    window.toastAviso    = (msg, dur) => showToast(msg, 'warning', dur);
})();


// ===== MODAL DE CONFIRMAÇÃO (substitui confirm()) =====
window.showConfirm = function(message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    return new Promise((resolve) => {
        // Remove modal anterior se existir
        const existing = document.getElementById('confirm-modal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'confirm-modal';
        overlay.innerHTML = `
            <div class="confirm-backdrop"></div>
            <div class="confirm-box">
                <p class="confirm-msg">${message}</p>
                <div class="confirm-btns">
                    <button class="confirm-btn-cancel">${cancelText}</button>
                    <button class="confirm-btn-ok">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Animação de entrada
        requestAnimationFrame(() => overlay.classList.add('confirm-show'));

        function close(result) {
            overlay.classList.remove('confirm-show');
            setTimeout(() => overlay.remove(), 250);
            resolve(result);
        }

        overlay.querySelector('.confirm-btn-ok').addEventListener('click', () => close(true));
        overlay.querySelector('.confirm-btn-cancel').addEventListener('click', () => close(false));
        overlay.querySelector('.confirm-backdrop').addEventListener('click', () => close(false));
    });
};
