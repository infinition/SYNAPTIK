// ==========================================
// UTILITIES
// ==========================================
class Utils {
    static showNotification(message, type = 'info', duration = 3000) {
        const notif = document.getElementById('notification');
        notif.textContent = message;
        notif.className = `notification ${type} show`;
        setTimeout(() => notif.classList.remove('show'), duration);
    }

    static showTooltip(element, text) {
        const tooltip = document.getElementById('tooltip');
        const rect = element.getBoundingClientRect();
        tooltip.textContent = text;
        tooltip.style.left = rect.left + rect.width / 2 + 'px';
        tooltip.style.top = rect.top - 35 + 'px';
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.classList.add('show');
    }

    static hideTooltip() {
        document.getElementById('tooltip').classList.remove('show');
    }

    static downloadFile(content, filename, type = 'application/json') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    static loadFile(callback, accept = '*') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => callback(evt.target.result, file);
                if (accept.includes('image')) {
                    reader.readAsDataURL(file);
                } else {
                    reader.readAsText(file);
                }
            }
        };
        input.click();
    }
}
