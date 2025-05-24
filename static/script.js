document.addEventListener('DOMContentLoaded', function() {
    // عناصر DOM
    const elements = {
        inputText: document.getElementById('inputText'),
        analyzeBtn: document.getElementById('analyzeBtn'),
        btnText: document.getElementById('btnText'),
        btnLoader: document.getElementById('btnLoader'),
        results: document.getElementById('results'),
        error: document.getElementById('error'),
        charCount: document.getElementById('charCount'),
        clearBtn: document.getElementById('clearBtn'),
        pasteBtn: document.getElementById('pasteBtn'),
        copyAllBtn: document.getElementById('copyAllBtn'),
        shareBtn: document.getElementById('shareBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        retryBtn: document.getElementById('retryBtn'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        
        // عناصر النتائج
        originalText: document.getElementById('originalText'),
        simplifiedText: document.getElementById('simplifiedText'),
        definitions: document.getElementById('definitions'),
        definitionsCount: document.getElementById('definitionsCount'),
        tashkeelText: document.getElementById('tashkeelText'),
        
        // عناصر الإحصائيات
        wordCount: document.getElementById('wordCount'),
        difficultWords: document.getElementById('difficultWords'),
        difficultyLevel: document.getElementById('difficultyLevel')
    };

    // متغيرات عامة
    let currentAnalysis = null;
    let isAnalyzing = false;

    // ========================================
    // 🎯 EVENT LISTENERS
    // ========================================

    // تحليل النص
    elements.analyzeBtn.addEventListener('click', analyzeText);
    
    // اختصارات لوحة المفاتيح
    elements.inputText.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            analyzeText();
        }
    });

    // عداد الأحرف مع تحديثات مباشرة
    elements.inputText.addEventListener('input', debounce(updateCharCount, 100));

    // أزرار الإدخال
    elements.clearBtn.addEventListener('click', clearText);
    elements.pasteBtn.addEventListener('click', pasteText);

    // أزرار النتائج
    elements.copyAllBtn.addEventListener('click', copyAllResults);
    elements.shareBtn.addEventListener('click', shareResults);
    elements.downloadBtn.addEventListener('click', downloadResults);
    elements.retryBtn.addEventListener('click', analyzeText);

    // أزرار النسخ الفردية
    document.addEventListener('click', function(e) {
        if (e.target.closest('.copy-btn')) {
            const target = e.target.closest('.copy-btn').dataset.target;
            const text = elements[target].textContent;
            copyToClipboard(text);
        }
    });

    // تحديث عداد الأحرف عند التحميل
    updateCharCount();

    // ========================================
    // 🔧 MAIN FUNCTIONS
    // ========================================

    async function analyzeText() {
        const text = elements.inputText.value.trim();
        
        // التحقق من صحة المدخلات
        if (!text) {
            showNotification('يرجى إدخال نص للتحليل', 'warning');
            elements.inputText.focus();
            return;
        }

        if (text.length < 10) {
            showNotification('النص قصير جداً. يرجى إدخال نص أطول للحصول على تحليل أفضل', 'warning');
            return;
        }

        if (text.length > 5000) {
            showNotification('النص طويل جداً. يرجى تقليل النص إلى أقل من 5000 حرف', 'warning');
            return;
        }

        if (isAnalyzing) {
            return;
        }

        // إخفاء النتائج والأخطاء السابقة
        hideAllSections();

        // تفعيل حالة التحميل
        setLoadingState(true);

        try {
            console.log('🚀 بدء تحليل النص:', text.substring(0, 50) + '...');
            
            const startTime = Date.now();
            
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text })
            });

            if (!response.ok) {
                throw new Error(`خطأ HTTP: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            const analysisTime = Date.now() - startTime;
            
            console.log(`✅ تم استلام النتائج في ${analysisTime}ms:`, data);
            
            currentAnalysis = data;
            displayResults(data, text);
            showNotification(`تم التحليل بنجاح في ${(analysisTime/1000).toFixed(1)} ثانية! 🎉`, 'success');
            
        } catch (err) {
            console.error('❌ خطأ في التحليل:', err);
            showError(err.message);
            showNotification('حدث خطأ أثناء التحليل. يرجى المحاولة مرة أخرى', 'error');
        } finally {
            setLoadingState(false);
        }
    }

    function displayResults(data, originalText) {
        // عرض النص الأصلي
        elements.originalText.textContent = data.original_text;

        // عرض النص المبسط
        elements.simplifiedText.textContent = data.simplified_text || 'لم يتم التبسيط';

        // عرض التعريفات
        displayDefinitions(data.definitions || []);

        // عرض النص مع التشكيل
        elements.tashkeelText.textContent = data.tashkeel_text || data.original_text;

        // عرض الإحصائيات
        displayAnalysisStats(originalText, data);

        // إظهار النتائج مع الحركة
        elements.results.classList.remove('hidden');
        elements.results.classList.add('fade-in');
        
        // التمرير للنتائج مع تأخير بسيط
        setTimeout(() => {
            elements.results.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }, 300);
    }

    function displayDefinitions(definitions) {
        elements.definitions.innerHTML = '';
        elements.definitionsCount.textContent = definitions.length;

        if (definitions.length === 0) {
            elements.definitions.innerHTML = `
                <div class="definition-item">
                    <div style="display: flex; align-items: center; gap: 8px; color: hsl(var(--muted-foreground)); font-style: italic;">
                        <i data-feather="check-circle" style="width: 16px; height: 16px;"></i>
                        <span>النص واضح ولا يحتوي على كلمات صعبة</span>
                    </div>
                </div>
            `;
            // تحديث الأيقونات
            feather.replace();
            return;
        }

        definitions.forEach((definition, index) => {
            const definitionElement = document.createElement('div');
            definitionElement.className = 'definition-item';
            definitionElement.style.animationDelay = `${index * 0.1}s`;
            definitionElement.classList.add('slide-up');
            
            // تحسين عرض التعريف
            const parts = definition.split(':');
            if (parts.length >= 2) {
                const word = parts[0].trim();
                const meaning = parts.slice(1).join(':').trim();
                definitionElement.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <strong style="color: hsl(var(--primary)); font-size: 1rem;">${word}</strong>
                        <span style="color: hsl(var(--foreground));">${meaning}</span>
                    </div>
                `;
            } else {
                definitionElement.textContent = definition;
            }
            
            elements.definitions.appendChild(definitionElement);
        });
    }

    function displayAnalysisStats(originalText, data) {
        // حساب إحصائيات النص
        const words = originalText.trim().split(/\s+/);
        const wordCount = words.length;
        const difficultWordsCount = data.definitions ? data.definitions.length : 0;
        const difficultyRatio = difficultWordsCount / wordCount;

        // تحديد مستوى الصعوبة
        let difficultyLevel = 'سهل';
        if (difficultyRatio > 0.3) {
            difficultyLevel = 'صعب';
        } else if (difficultyRatio > 0.15) {
            difficultyLevel = 'متوسط';
        }

        // عرض الإحصائيات
        elements.wordCount.textContent = wordCount.toLocaleString('ar-SA');
        elements.difficultWords.textContent = difficultWordsCount.toLocaleString('ar-SA');
        elements.difficultyLevel.textContent = difficultyLevel;
        
        // تلوين مستوى الصعوبة
        const difficultyElement = elements.difficultyLevel;
        difficultyElement.style.color = 
            difficultyLevel === 'صعب' ? 'hsl(var(--destructive))' :
            difficultyLevel === 'متوسط' ? 'hsl(var(--accent))' :
            'hsl(var(--primary))';
    }

    // ========================================
    // 🎨 UI HELPER FUNCTIONS
    // ========================================

    function setLoadingState(loading) {
        isAnalyzing = loading;
        elements.analyzeBtn.disabled = loading;
        
        if (loading) {
            elements.btnText.classList.add('hidden');
            elements.btnLoader.classList.remove('hidden');
            elements.loadingOverlay.classList.remove('hidden');
            
            // تحديث نص التحميل بشكل ديناميكي
            updateLoadingText();
        } else {
            elements.btnText.classList.remove('hidden');
            elements.btnLoader.classList.add('hidden');
            elements.loadingOverlay.classList.add('hidden');
        }
    }

    function updateLoadingText() {
        const loadingTexts = [
            'معالجة النص...',
            'تحليل المعاني...',
            'استخراج التعريفات...',
            'إضافة التشكيل...',
            'تبسيط النص...',
            'تجهيز النتائج...'
        ];
        
        let index = 0;
        const progressText = document.querySelector('.progress-text');
        
        const interval = setInterval(() => {
            if (!isAnalyzing) {
                clearInterval(interval);
                return;
            }
            
            if (progressText) {
                progressText.textContent = loadingTexts[index];
                index = (index + 1) % loadingTexts.length;
            }
        }, 800);
    }

    function hideAllSections() {
        elements.results.classList.add('hidden');
        elements.error.classList.add('hidden');
    }

    function showError(message = '') {
        elements.error.classList.remove('hidden');
        elements.error.classList.add('fade-in');
        
    function showError(message = '') {
        elements.error.classList.remove('hidden');
        elements.error.classList.add('fade-in');
        
        if (message) {
            const errorP = elements.error.querySelector('p');
            if (errorP) {
                errorP.textContent = `خطأ: ${message}`;
            }
        }
    }

    function updateCharCount() {
        const count = elements.inputText.value.length;
        elements.charCount.textContent = `${count.toLocaleString('ar-SA')} حرف`;
        
        // تغيير لون العداد حسب الطول مع نظام الألوان الجديد
        if (count > 4000) {
            elements.charCount.style.color = 'hsl(var(--destructive))';
        } else if (count > 2000) {
            elements.charCount.style.color = 'hsl(var(--accent))';
        } else {
            elements.charCount.style.color = 'hsl(var(--muted-foreground))';
        }
        
        // تحديث placeholder حسب طول النص
        if (count === 0) {
            elements.inputText.placeholder = "مثال: وما الحياة الدنيا إلا متاع الغرور...";
        }
    }

    // ========================================
    // 📋 CLIPBOARD & FILE FUNCTIONS
    // ========================================

    async function clearText() {
        if (elements.inputText.value.length > 0) {
            // تأكيد المسح للنصوص الطويلة
            if (elements.inputText.value.length > 500) {
                if (!confirm('هل أنت متأكد من مسح النص؟')) {
                    return;
                }
            }
        }
        
        elements.inputText.value = '';
        elements.inputText.focus();
        updateCharCount();
        hideAllSections();
        showNotification('تم مسح النص', 'info');
    }

    async function pasteText() {
        try {
            const text = await navigator.clipboard.readText();
            if (text.trim()) {
                elements.inputText.value = text;
                elements.inputText.focus();
                updateCharCount();
                showNotification('تم لصق النص بنجاح', 'success');
            } else {
                showNotification('الحافظة فارغة', 'warning');
            }
        } catch (err) {
            console.error('خطأ في اللصق:', err);
            showNotification('لا يمكن الوصول للحافظة. يرجى اللصق يدوياً (Ctrl+V)', 'warning');
        }
    }

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showNotification('تم نسخ النص إلى الحافظة', 'success');
        } catch (err) {
            console.error('خطأ في النسخ:', err);
            fallbackCopyTextToClipboard(text);
        }
    }

    function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            showNotification('تم نسخ النص إلى الحافظة', 'success');
        } catch (err) {
            console.error('فشل في النسخ:', err);
            showNotification('فشل في نسخ النص', 'error');
        }
        
        document.body.removeChild(textArea);
    }

    async function copyAllResults() {
        if (!currentAnalysis) return;

        const timestamp = new Date().toLocaleString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const allResults = `
🌟 تحليل فصيح - ${timestamp}
${'='.repeat(50)}

📝 النص الأصلي:
${currentAnalysis.original_text}

✨ النص المبسط:
${currentAnalysis.simplified_text}

📚 معاني الكلمات الصعبة:
${currentAnalysis.definitions.length > 0 ? 
    currentAnalysis.definitions.map((def, i) => `${i + 1}. ${def}`).join('\n') : 
    'لا توجد كلمات صعبة'}

🎵 النص مع التشكيل:
${currentAnalysis.tashkeel_text}

📊 إحصائيات التحليل:
• عدد الكلمات: ${elements.wordCount.textContent}
• الكلمات الصعبة: ${elements.difficultWords.textContent}
• مستوى الصعوبة: ${elements.difficultyLevel.textContent}

${'='.repeat(50)}
تم التحليل بواسطة فصيح - مبسط اللغة العربية
🌐 مدعوم بالذكاء الاصطناعي
        `.trim();

        await copyToClipboard(allResults);
    }

    async function shareResults() {
        if (!currentAnalysis) return;

        const shareText = `تم تبسيط النص باستخدام فصيح:\n\n"${currentAnalysis.original_text.substring(0, 100)}${currentAnalysis.original_text.length > 100 ? '...' : '"}"\n\nالنص المبسط: "${currentAnalysis.simplified_text.substring(0, 150)}${currentAnalysis.simplified_text.length > 150 ? '...' : ''}"`;
        
        const shareData = {
            title: 'نتائج تحليل فصيح',
            text: shareText,
            url: window.location.href
        };

        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
                showNotification('تم المشاركة بنجاح', 'success');
            } else {
                // Fallback: نسخ النص المختصر
                await copyToClipboard(shareText + `\n\nجرب فصيح: ${window.location.href}`);
                showNotification('تم نسخ النص للمشاركة', 'success');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('خطأ في المشاركة:', err);
                await copyToClipboard(shareText + `\n\nجرب فصيح: ${window.location.href}`);
                showNotification('تم نسخ النص للمشاركة', 'success');
            }
        }
    }

    async function downloadResults() {
        if (!currentAnalysis) return;

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `فصيح_تحليل_${timestamp}.txt`;
        
        const content = `فصيح - مبسط اللغة العربية
تحليل النص - ${new Date().toLocaleString('ar-SA')}
${'='.repeat(60)}

النص الأصلي:
${currentAnalysis.original_text}

النص المبسط:
${currentAnalysis.simplified_text}

معاني الكلمات الصعبة:
${currentAnalysis.definitions.length > 0 ? 
    currentAnalysis.definitions.map((def, i) => `${i + 1}. ${def}`).join('\n') : 
    'لا توجد كلمات صعبة في هذا النص'}

النص مع التشكيل:
${currentAnalysis.tashkeel_text}

إحصائيات التحليل:
• عدد الكلمات: ${elements.wordCount.textContent}
• عدد الكلمات الصعبة: ${elements.difficultWords.textContent}
• مستوى الصعوبة: ${elements.difficultyLevel.textContent}

${'='.repeat(60)}
تم إنشاء هذا التحليل بواسطة فصيح
مبسط اللغة العربية بالذكاء الاصطناعي
`;

        try {
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showNotification('تم تحميل ملف التحليل بنجاح', 'success');
        } catch (err) {
            console.error('خطأ في التحميل:', err);
            showNotification('فشل في تحميل الملف', 'error');
        }
    }

    // ========================================
    // 🔔 ENHANCED NOTIFICATION SYSTEM
    // ========================================

    function showNotification(message, type = 'info', duration = 5000) {
        // إزالة الإشعارات السابقة
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());

        // إنشاء إشعار جديد
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // أيقونات حسب النوع
        const icons = {
            success: '<i data-feather="check-circle"></i>',
            error: '<i data-feather="x-circle"></i>',
            warning: '<i data-feather="alert-triangle"></i>',
            info: '<i data-feather="info"></i>'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    ${icons[type] || icons.info}
                </div>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i data-feather="x"></i>
                </button>
            </div>
        `;

        // إضافة الستايل
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1001;
            padding: 16px 20px;
            border-radius: calc(var(--radius) + 2px);
            box-shadow: 0 10px 15px -3px hsl(var(--primary) / 0.1), 0 4px 6px -2px hsl(var(--primary) / 0.05);
            font-family: var(--font-arabic);
            font-size: 14px;
            max-width: 400px;
            min-width: 300px;
            animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid hsl(var(--border));
            backdrop-filter: blur(8px);
        `;

        // ألوان حسب النوع مع نظام shadcn/ui
        const colors = {
            success: { 
                bg: 'hsl(var(--card))', 
                border: 'hsl(var(--primary))', 
                text: 'hsl(var(--card-foreground))',
                icon: 'hsl(var(--primary))'
            },
            error: { 
                bg: 'hsl(var(--card))', 
                border: 'hsl(var(--destructive))', 
                text: 'hsl(var(--card-foreground))',
                icon: 'hsl(var(--destructive))'
            },
            warning: { 
                bg: 'hsl(var(--card))', 
                border: 'hsl(var(--accent))', 
                text: 'hsl(var(--card-foreground))',
                icon: 'hsl(var(--accent))'
            },
            info: { 
                bg: 'hsl(var(--card))', 
                border: 'hsl(var(--muted-foreground))', 
                text: 'hsl(var(--card-foreground))',
                icon: 'hsl(var(--muted-foreground))'
            }
        };

        const color = colors[type] || colors.info;
        notification.style.backgroundColor = color.bg;
        notification.style.borderRightColor = color.border;
        notification.style.color = color.text;

        document.body.appendChild(notification);

        // تحديث الأيقونات
        feather.replace();

        // تطبيق ألوان الأيقونات
        const iconElement = notification.querySelector('.notification-icon svg');
        if (iconElement) {
            iconElement.style.color = color.icon;
        }

        // إزالة تلقائية
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }

    // ========================================
    // 🔧 UTILITY FUNCTIONS
    // ========================================

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ========================================
    // 🎯 INITIALIZATION & WELCOME
    // ========================================

    // إضافة الستايل للإشعارات
    const notificationStyles = document.createElement('style');
    notificationStyles.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .notification-icon {
            flex-shrink: 0;
        }
        
        .notification-icon svg {
            width: 18px;
            height: 18px;
        }
        
        .notification-message {
            flex: 1;
        }
        
        .notification-close {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            border-radius: calc(var(--radius) / 2);
            opacity: 0.7;
            transition: all 0.2s ease;
            color: hsl(var(--muted-foreground));
            flex-shrink: 0;
        }
        
        .notification-close:hover {
            opacity: 1;
            background: hsl(var(--muted) / 0.5);
        }
        
        .notification-close svg {
            width: 14px;
            height: 14px;
        }
    `;
    document.head.appendChild(notificationStyles);

    // رسالة ترحيب
    console.log('✅ تم تحميل فصيح بنجاح مع نظام shadcn/ui!');
    setTimeout(() => {
        showNotification('مرحباً بك في فصيح الجديد! 🌟 جرب الوضع المظلم', 'info', 4000);
    }, 1000);

    // إضافة تلميح سريع للاختصارات
    elements.inputText.addEventListener('focus', function() {
        if (!elements.inputText.value && !localStorage.getItem('tooltipShown')) {
            setTimeout(() => {
                showNotification('💡 نصيحة: استخدم Ctrl+Enter للتحليل السريع', 'info', 3000);
                localStorage.setItem('tooltipShown', 'true');
            }, 2000);
        }
    }, { once: true });
});