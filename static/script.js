document.addEventListener('DOMContentLoaded', function() {
    const inputText = document.getElementById('inputText');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    const simplifiedText = document.getElementById('simplifiedText');
    const definitions = document.getElementById('definitions');
    const tashkeelText = document.getElementById('tashkeelText');

    analyzeBtn.addEventListener('click', analyzeText);
    inputText.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            analyzeText();
        }
    });

    async function analyzeText() {
        const text = inputText.value.trim();
        
        if (!text) {
            alert('يرجى إدخال نص للتحليل');
            return;
        }

        // إخفاء النتائج والأخطاء السابقة
        results.classList.add('hidden');
        error.classList.add('hidden');

        // تفعيل حالة التحميل
        analyzeBtn.disabled = true;
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text })
            });

            if (!response.ok) {
                throw new Error('فشل في التحليل');
            }

            const data = await response.json();
            displayResults(data);
        } catch (err) {
            console.error('خطأ:', err);
            error.classList.remove('hidden');
        } finally {
            // إيقاف حالة التحميل
            analyzeBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    }

    function displayResults(data) {
        // عرض النص المبسط
        simplifiedText.textContent = data.simplified_text;

        // عرض التعريفات
        definitions.innerHTML = '';
        data.definitions.forEach(def => {
            const li = document.createElement('li');
            li.textContent = def;
            definitions.appendChild(li);
        });

        // عرض النص مع التشكيل
        tashkeelText.textContent = data.tashkeel_text;

        // إظهار النتائج
        results.classList.remove('hidden');
        
        // التمرير للنتائج
        results.scrollIntoView({ behavior: 'smooth' });
    }
});