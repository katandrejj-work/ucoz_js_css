(function() {
    // Функция проверки блокировки клика
    function checkClick(e) {
        e.preventDefault(); // Останавливаем стандартное действие (переход по ссылке и т.д.)
        e.stopPropagation(); // Останавливаем всплытие, чтобы не спамить в консоль лишний раз

        const target = e.target;
        const style = window.getComputedStyle(target);
        const rect = target.getBoundingClientRect();

        console.group(`🖱️ Клик в точке: X=${e.clientX}, Y=${e.clientY}`);
        
        // 1. Куда реально попал клик (элемент)
        console.log('Элемент (Target):', target);
        console.log('HTML:', target.outerHTML.substring(0, 100) + '...');

        // 2. Проверка на блокировку pointer-events
        if (style.pointerEvents === 'none') {
            console.warn('⚠️ ВНИМАНИЕ: Клик блокируется стилем pointer-events: none!');
        } else {
            console.log('✅ pointer-events: auto (норма)');
        }

        // 3. Проверка на прозрачность (opacity 0)
        if (style.opacity === '0') {
            console.warn('⚠️ Элемент полностью прозрачен (opacity: 0).');
        }

        // 4. Проверка на видимость (display: none) - хотя по нему обычно нельзя кликнуть
        if (style.display === 'none') {
            console.warn('⚠️ Элемент скрыт (display: none), но событие сработало (возможно, на родителе).');
        }

        // 5. Визуальная метка на экране (кружок в месте клика)
        const dot = document.createElement('div');
        dot.style.position = 'fixed';
        dot.style.left = (e.clientX - 5) + 'px';
        dot.style.top = (e.clientY - 5) + 'px';
        dot.style.width = '10px';
        dot.style.height = '10px';
        dot.style.backgroundColor = 'red';
        dot.style.borderRadius = '50%';
        dot.style.zIndex = '999999';
        dot.style.pointerEvents = 'none'; // Чтобы сам кружок не мешал кликать
        document.body.appendChild(dot);

        // Удаляем метку через 1 секунду
        setTimeout(() => dot.remove(), 1000);

        console.groupEnd();
    }

    // Добавляем слушатель на весь документ (capture: true ловит клик в самом начале)
    document.addEventListener('mousedown', checkClick, true);
    
    console.log('🚀 Тест кликов запущен! Кликайте по экрану. Чтобы остановить, обновите страницу.');
})();