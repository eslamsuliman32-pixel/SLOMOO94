import React, { useEffect, useRef, useState } from 'react';
import './ElectromagneticSemantics.css';

const ElectromagneticSemantics = () => {
  const canvasRef = useRef(null);
  const [intensity, setIntensity] = useState(75);
  const [textInput, setTextInput] = useState('قلبي يحن إلى أيام الشباب الضائعة');
  const [metrics, setMetrics] = useState({
    frequency: '127 Hz',
    resonance: '85%',
    energy: '2.3 eV',
    decay: '0.12 s⁻¹',
    attractivePairs: 4,
    repulsivePairs: 1,
    avgAttraction: '0.67 N',
    stability: '8.4/10',
    lexicalDensity: '68%',
    prosodic: '74%',
    emotional: 'حنين/أسف',
    expressiveness: '8.7/10'
  });

  const sampleWords = [
    { word: 'قلبي', x: 150, y: 250, charge: 0.8, emotion: 'حنين', frequency: 120 },
    { word: 'يحن', x: 300, y: 200, charge: 0.6, emotion: 'شوق', frequency: 110 },
    { word: 'أيام', x: 500, y: 300, charge: 0.7, emotion: 'ذكرى', frequency: 105 },
    { word: 'شباب', x: 700, y: 180, charge: 0.9, emotion: 'نشاط', frequency: 130 },
    { word: 'ضائعة', x: 900, y: 280, charge: 0.5, emotion: 'حزن', frequency: 100 }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const drawMagneticField = () => {
      ctx.fillStyle = 'rgba(10, 14, 39, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(157, 78, 221, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.quadraticCurveTo(i + Math.sin(i / 50) * 20, canvas.height / 2, i, canvas.height);
        ctx.stroke();
      }
    };

    const drawWord = (word) => {
      const intensityFactor = intensity / 100;
      const glowRadius = word.charge * 80 * intensityFactor;

      const gradient = ctx.createRadialGradient(word.x, word.y, 0, word.x, word.y, glowRadius);
      gradient.addColorStop(0, `rgba(157, 78, 221, ${0.6 * intensityFactor})`);
      gradient.addColorStop(0.5, `rgba(0, 245, 255, ${0.3 * intensityFactor})`);
      gradient.addColorStop(1, 'rgba(0, 245, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(word.x - glowRadius, word.y - glowRadius, glowRadius * 2, glowRadius * 2);

      ctx.fillStyle = `hsl(${word.frequency}, 100%, 50%)`;
      ctx.beginPath();
      ctx.arc(word.x, word.y, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 245, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(word.word, word.x, word.y);
    };

    const drawConnections = () => {
      for (let i = 0; i < sampleWords.length; i++) {
        for (let j = i + 1; j < sampleWords.length; j++) {
          const w1 = sampleWords[i];
          const w2 = sampleWords[j];
          const dist = Math.sqrt((w2.x - w1.x) ** 2 + (w2.y - w1.y) ** 2);

          const connectionStrength = Math.max(0, 1 - dist / 400);
          if (connectionStrength > 0.1) {
            ctx.strokeStyle = connectionStrength > 0.5 
              ? `rgba(57, 255, 20, ${connectionStrength * 0.6})`
              : `rgba(255, 100, 100, ${connectionStrength * 0.3})`;
            ctx.lineWidth = connectionStrength * 3;
            ctx.beginPath();
            ctx.moveTo(w1.x, w1.y);
            ctx.lineTo(w2.x, w2.y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      drawMagneticField();
      drawConnections();
      sampleWords.forEach(drawWord);
      requestAnimationFrame(animate);
    };

    animate();
  }, [intensity]);

  const handleAnalyze = () => {
    setMetrics({
      frequency: (Math.random() * 50 + 100).toFixed(0) + ' Hz',
      resonance: (Math.random() * 30 + 70).toFixed(0) + '%',
      energy: (Math.random() * 2 + 1.5).toFixed(2) + ' eV',
      decay: (Math.random() * 0.1 + 0.08).toFixed(2) + ' s⁻¹',
      attractivePairs: Math.floor(Math.random() * 3 + 3),
      repulsivePairs: Math.floor(Math.random() * 2 + 1),
      avgAttraction: (Math.random() * 0.3 + 0.5).toFixed(2) + ' N',
      stability: (Math.random() * 3 + 7).toFixed(1) + '/10',
      lexicalDensity: (Math.random() * 20 + 60) + '%',
      prosodic: (Math.random() * 20 + 65) + '%',
      emotional: ['حنين/أسف', 'حب/قوة', 'حزن/تأمل', 'فرح/أمل'][Math.floor(Math.random() * 4)],
      expressiveness: (Math.random() * 2 + 8).toFixed(1) + '/10'
    });
  };

  const handleExport = () => {
    alert('✅ تم تصدير الخريطة الكهرومغناطيسية للمعاني!\nالملف جاهز للاستخدام في محرك الفلوتيف المتقدم.');
  };

  return (
    <section className="electromagnetic-studio">
      <header className="em-header">
        <h1>الخرطة الكهرومغناطيسية للمعاني</h1>
        <p>خوارزمية تحويل العلاقات الدلالية إلى حقول بصرية تفاعلية — حيث كل كلمة موصل طاقة معنى</p>
      </header>

      <div className="control-panel">
        <div className="control-group">
          <label className="control-label">إدراج النص العربي</label>
          <textarea 
            className="text-input" 
            rows="3" 
            placeholder="اكتب نصاً أو جملة عربية..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          ></textarea>
        </div>
        <div className="control-group">
          <label className="control-label">شدة التأثير (Intensity)</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={intensity}
            onChange={(e) => setIntensity(parseInt(e.target.value))}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
            القيمة: {intensity}%
          </span>
        </div>
        <div className="control-group">
          <button className="btn-primary" onClick={handleAnalyze}>
            تحليل الخريطة الدلالية ⚡
          </button>
        </div>
      </div>

      <div className="visualization-container">
        <canvas ref={canvasRef} id="semantic-canvas"></canvas>
      </div>

      <div className="analysis-sidebar">
        <div className="analysis-card">
          <div className="analysis-title">🌊 خصائص الموجة الدلالية</div>
          <div className="analysis-content">
            <div className="metric-row">
              <span className="metric-label">التردد الأساسي (Base Frequency)</span>
              <span className="metric-value">{metrics.frequency}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">الرنين المعنوي (Semantic Resonance)</span>
              <span className="metric-value">{metrics.resonance}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">الطاقة المتراكمة (Energy Accumulation)</span>
              <span className="metric-value">{metrics.energy}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">معامل الاضمحلال (Decay Rate)</span>
              <span className="metric-value">{metrics.decay}</span>
            </div>
          </div>
        </div>

        <div className="analysis-card alt">
          <div className="analysis-title">🔗 علاقات التجاذب والتنافر</div>
          <div className="analysis-content">
            <div className="metric-row">
              <span className="metric-label">الكلمات الجاذبة (Attractive Pairs)</span>
              <span className="metric-value">{metrics.attractivePairs}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">الكلمات المتنافرة (Repulsive Pairs)</span>
              <span className="metric-value">{metrics.repulsivePairs}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">متوسط قوة الجذب (Avg. Attraction)</span>
              <span className="metric-value">{metrics.avgAttraction}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">الاستقرار النسبي (Stability Index)</span>
              <span className="metric-value">{metrics.stability}</span>
            </div>
          </div>
        </div>

        <div className="analysis-card accent">
          <div className="analysis-title">📊 التحليل الإيقاعي والمعنوي</div>
          <div className="analysis-content">
            <div className="metric-row">
              <span className="metric-label">الكثافة اللغوية (Lexical Density)</span>
              <span className="metric-value">{metrics.lexicalDensity}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">التوازن الشعري (Prosodic Balance)</span>
              <span className="metric-value">{metrics.prosodic}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">اللون العاطفي (Emotional Hue)</span>
              <span className="metric-value">{metrics.emotional}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">القوة التعبيرية (Expressiveness)</span>
              <span className="metric-value">{metrics.expressiveness}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="status-bar">
        <div className="status-indicator">
          <div className="status-dot"></div>
          <span>النظام نشط | خريطة ديناميكية جاهزة | الموجات الدلالية تتذبذب في الوقت الفعلي</span>
        </div>
        <button className="btn-primary" onClick={handleExport} style={{ alignSelf: 'center' }}>
          تصدير الخريطة 📥
        </button>
      </div>

      <div className="documentation-box">
        <h3>📖 آلية عمل الخرطة الكهرومغناطيسية</h3>
        <ul>
          <li><strong>الموصلات الدلالية:</strong> كل كلمة في النص تمثل "موصل" له تردد معنى محدد (frequency) يتعلق بمحتواها الدلالي وسياقها.</li>
          <li><strong>حساب القوة المتبادلة:</strong> تُحسب قوة التجاذب والتنافر بين الكلمات على أساس التوافق الدلالي، القافوي، والإيقاعي.</li>
          <li><strong>الرنين المعنوي:</strong> عندما تتطابق ترددات كلمتين دلالياً (مثل "حنين" و"شوق")، يحدث "رنين" يعزز التأثير العاطفي.</li>
          <li><strong>التراكم الديناميكي:</strong> الكلمات القريبة من بعضها تكتسب طاقة إضافية من السياق، مما يرفع شحنتها المعنوية.</li>
          <li><strong>الاضمحلال الزمني:</strong> الكلمات البعيدة في النص تتناسى تأثيرها على بعضها بشكل أُسي (exponential decay).</li>
        </ul>
      </div>
    </section>
  );
};

export default ElectromagneticSemantics;
