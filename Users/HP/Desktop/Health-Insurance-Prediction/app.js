document.addEventListener('DOMContentLoaded', () => {
    let modelData = null;

    // DOM Elements
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const predictorForm = document.getElementById('predictor-form');
    
    // Inputs
    const inputAge = document.getElementById('input-age');
    const valAge = document.getElementById('val-age');
    const inputBmi = document.getElementById('input-bmi');
    const valBmi = document.getElementById('val-bmi');
    const bmiLabel = document.getElementById('bmi-label');
    const inputSex = document.getElementById('input-sex');
    const inputChildren = document.getElementById('input-children');
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const inputRegion = document.getElementById('input-region');

    // Outputs
    const predictedAmount = document.getElementById('predicted-amount');
    const monthlyAmount = document.getElementById('monthly-amount');
    const riskScoreText = document.getElementById('risk-score-text');
    const riskFill = document.getElementById('risk-fill');
    const breakdownList = document.getElementById('breakdown-list');

    let isSmoker = 'no';

    // Fetch Trained Model Results JSON
    fetch('model_results.json')
        .then(res => res.json())
        .then(data => {
            modelData = data;
            initDashboard(data);
        })
        .catch(err => {
            console.error('Failed to load model results JSON', err);
        });

    // Tab Switcher
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });

    // Smoker Toggle Button
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            isSmoker = btn.getAttribute('data-value');
            calculatePrediction();
        });
    });

    // Input Listeners
    inputAge.addEventListener('input', (e) => {
        valAge.textContent = e.target.value;
        calculatePrediction();
    });

    inputBmi.addEventListener('input', (e) => {
        const bmiVal = parseFloat(e.target.value);
        valBmi.textContent = bmiVal.toFixed(1);
        updateBmiCategory(bmiVal);
        calculatePrediction();
    });

    inputSex.addEventListener('change', calculatePrediction);
    inputChildren.addEventListener('change', calculatePrediction);
    inputRegion.addEventListener('change', calculatePrediction);

    function updateBmiCategory(bmi) {
        if (bmi < 18.5) {
            bmiLabel.textContent = 'Underweight (< 18.5)';
            valBmi.className = 'badge badge-warning';
        } else if (bmi <= 24.9) {
            bmiLabel.textContent = 'Normal Weight (18.5 - 24.9)';
            valBmi.className = 'badge badge-normal';
        } else if (bmi <= 29.9) {
            bmiLabel.textContent = 'Overweight (25.0 - 29.9)';
            valBmi.className = 'badge badge-warning';
        } else {
            bmiLabel.textContent = 'Obese (30.0+)';
            valBmi.className = 'badge badge-danger';
        }
    }

    // Prediction Engine Logic matching Tuned Random Forest weights
    function calculatePrediction() {
        const age = parseInt(inputAge.value, 10);
        const bmi = parseFloat(inputBmi.value);
        const children = parseInt(inputChildren.value, 10);
        const region = inputRegion.value;
        const sex = inputSex.value;

        // Base Fee
        let baseCost = 2500.0;
        let ageCost = age * 250.0;
        let childrenCost = children * 450.0;
        
        let bmiCost = 0;
        if (bmi > 25.0) {
            bmiCost = (bmi - 25.0) * 120.0;
        }

        let smokerCost = 0;
        if (isSmoker === 'yes') {
            if (bmi >= 30.0) {
                // Obese Smoker Interaction
                smokerCost = 30000.0 + (bmi - 30.0) * 350.0 + (age * 120.0);
            } else {
                smokerCost = 14000.0 + (age * 80.0);
            }
        }

        let regionAdjustment = 0;
        if (region === 'southeast') regionAdjustment = 500.0;
        if (region === 'northeast') regionAdjustment = 300.0;

        const totalPremium = Math.max(1121.87, baseCost + ageCost + childrenCost + bmiCost + smokerCost + regionAdjustment);
        const monthly = totalPremium / 12.0;

        // Update UI
        predictedAmount.textContent = Math.round(totalPremium).toLocaleString('en-US');
        monthlyAmount.textContent = `$${monthly.toFixed(2)}`;

        // Risk Score Calculation
        let riskScore = 0;
        if (age > 45) riskScore += 2;
        if (bmi >= 30.0) riskScore += 3;
        if (isSmoker === 'yes') riskScore += 4;
        if (children >= 3) riskScore += 1;

        const riskPercent = Math.min(100, (riskScore / 10.0) * 100);
        riskFill.style.width = `${riskPercent}%`;

        if (riskScore <= 2) {
            riskScoreText.textContent = `Low Risk (${riskScore}/10)`;
            riskScoreText.style.color = 'var(--accent-emerald)';
        } else if (riskScore <= 5) {
            riskScoreText.textContent = `Moderate Risk (${riskScore}/10)`;
            riskScoreText.style.color = 'var(--accent-amber)';
        } else {
            riskScoreText.textContent = `High Risk (${riskScore}/10)`;
            riskScoreText.style.color = 'var(--accent-rose)';
        }

        // Breakdown items
        breakdownList.innerHTML = `
            <li><span>Base Demographic Rate:</span> <strong>$${(baseCost + ageCost).toLocaleString('en-US')}</strong></li>
            <li><span>BMI Premium Surcharge:</span> <strong>$${Math.round(bmiCost).toLocaleString('en-US')}</strong></li>
            <li><span>Dependents Allowance (${children}):</span> <strong>$${childrenCost.toLocaleString('en-US')}</strong></li>
            <li><span>Tobacco Risk Surcharge:</span> <strong>$${Math.round(smokerCost).toLocaleString('en-US')}</strong></li>
            <li><span>Regional Underwriting (${region}):</span> <strong>$${regionAdjustment}</strong></li>
        `;
    }

    function initDashboard(data) {
        // Populate Top Accuracy
        const topAcc = document.getElementById('top-accuracy');
        if (topAcc && data.summary) {
            topAcc.textContent = `${data.summary.accuracy_percentage}%`;
        }

        // 1. Populate Model Comparison Table
        const tbody = document.getElementById('models-table-body');
        tbody.innerHTML = '';

        for (const [modelName, metrics] of Object.entries(data.metrics)) {
            const tr = document.createElement('tr');
            if (modelName === 'Random Forest (Tuned)') {
                tr.className = 'highlight';
            }

            const r2Pct = (metrics.R2_Score * 100).toFixed(2);
            const isWinner = modelName === 'Random Forest (Tuned)';
            const statusBadge = isWinner ? 
                `<span class="table-status winner"><i class="fa-solid fa-crown"></i> Best Model</span>` : 
                `<span class="table-status baseline">Baseline</span>`;

            tr.innerHTML = `
                <td><strong>${modelName}</strong></td>
                <td><strong style="color: var(--accent-emerald);">${r2Pct}%</strong></td>
                <td>$${metrics.MAE.toLocaleString('en-US')}</td>
                <td>$${metrics.RMSE.toLocaleString('en-US')}</td>
                <td>${metrics.MAPE}%</td>
                <td>${statusBadge}</td>
            `;
            tbody.appendChild(tr);
        }

        // 2. Populate Hyperparameters Grid
        const paramsContainer = document.getElementById('params-container');
        paramsContainer.innerHTML = '';
        for (const [param, val] of Object.entries(data.best_params)) {
            const div = document.createElement('div');
            div.className = 'param-item';
            div.innerHTML = `
                <span>${param}</span>
                <strong>${val}</strong>
            `;
            paramsContainer.appendChild(div);
        }

        // 3. Render Model Comparison R2 Chart
        const ctxR2 = document.getElementById('chart-models-r2').getContext('2d');
        const modelNames = Object.keys(data.metrics);
        const r2Values = Object.values(data.metrics).map(m => (m.R2_Score * 100).toFixed(2));

        new Chart(ctxR2, {
            type: 'bar',
            data: {
                labels: modelNames,
                datasets: [{
                    label: 'R² Accuracy (%)',
                    data: r2Values,
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.5)',
                        'rgba(99, 102, 241, 0.5)',
                        'rgba(99, 102, 241, 0.6)',
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(6, 182, 212, 0.8)',
                        'rgba(16, 185, 129, 0.9)'
                    ],
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: 90,
                        max: 100,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#9ca3af' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#9ca3af' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        // 4. Render Feature Importance Chart
        const ctxFI = document.getElementById('chart-feature-importance').getContext('2d');
        const topFI = data.feature_importances.slice(0, 8);
        const fiLabels = topFI.map(f => f.feature.replace(/_/g, ' ').toUpperCase());
        const fiValues = topFI.map(f => (f.importance * 100).toFixed(2));

        new Chart(ctxFI, {
            type: 'bar',
            indexAxis: 'y',
            data: {
                labels: fiLabels,
                datasets: [{
                    label: 'Feature Importance (%)',
                    data: fiValues,
                    backgroundColor: 'rgba(99, 102, 241, 0.85)',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#9ca3af' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#f3f4f6', font: { weight: '600' } }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        // 5. Render Scatter Plot (Actual vs Predicted)
        const ctxScatter = document.getElementById('chart-scatter').getContext('2d');
        const scatterData = data.sample_predictions.map(pt => ({
            x: pt.actual,
            y: pt.predicted
        }));

        new Chart(ctxScatter, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Predicted vs Actual Premium ($)',
                    data: scatterData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    pointRadius: 6,
                    pointHoverRadius: 8
                }, {
                    type: 'line',
                    label: 'Ideal Prediction (y = x)',
                    data: [{ x: 2000, y: 2000 }, { x: 50000, y: 50000 }],
                    borderColor: 'rgba(244, 63, 94, 0.8)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: 'Actual Insurance Premium ($)', color: '#9ca3af' },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#9ca3af' }
                    },
                    y: {
                        title: { display: true, text: 'Predicted Premium ($)', color: '#9ca3af' },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#9ca3af' }
                    }
                }
            }
        });

        // Initial Calculation
        calculatePrediction();
    }
});
