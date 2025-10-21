<script>
        // Inicializar Lucide Icons
        lucide.createIcons();
        
        // Clave de usuario activo usada en login.html
        const CURRENT_USER_KEY = 'chronos_current_user';
        
        // Función de utilidad para obtener la fecha de hoy en YYYY-MM-DD
        function getTodayDateKey(date = new Date()) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        
        // --- ESTADO GLOBAL DE FECHA ---
        let currentViewingDateKey = getTodayDateKey();
        let isHistoryMode = false;
        
        // --- CONSTANTES MODULAR ---
        const AUX_STATES = ['voice', 'chat', 'email', 'giftcard', 'meeting', 'training', 'break', 'lunch', 'ready', 'offline'];
        const INTERACTION_STATES = ['voice', 'chat', 'email', 'giftcard'];
        const ALL_TIME_TRACKED_STATES = ['voice', 'chat', 'email', 'giftcard', 'meeting', 'training', 'break', 'lunch'];
        const METRICS_INITIAL = { voice: { count: 0, time: 0 }, chat: { count: 0, time: 0 }, email: { count: 0, time: 0 }, giftcard: { count: 0, time: 0 }, break: { count: 0, time: 0 }, lunch: { count: 0, time: 0 }, meeting: { count: 0, time: 0 }, training: { count: 0, time: 0 } };
        const POMODORO_FOCUS_DURATION = 25 * 60; // 25 minutos
        const POMODORO_BREAK_DURATION = 5 * 60;  // 5 minutos
        const POMODORO_LONG_BREAK_DURATION = 15 * 60; // 15 minutos
        
        // Categorías de Transacciones 
        const TRANSACTION_CATEGORIES = {
            income: ['Salary', 'Investment', 'Other'],
            expense: ['Food', 'Services', 'Transport', 'Entertainment', 'Bills', 'Rent', 'Other']
        };
        
        // Variables globales para Chart.js
        let auxTimeChartInstance;
        let taskCompletionChartInstance;
        let expenseCategoryChartInstance;
        let pomodoroConsistencyChartInstance;
        let balanceEvolutionChartInstance;
        
        // --- LÓGICA DE NAVEGACIÓN MODULAR Y SESIÓN ---
        
        function checkSession() {
            const username = localStorage.getItem(CURRENT_USER_KEY);
            if (!username) {
                window.location.href = 'login.html';
                return;
            }
            
            document.getElementById('current-username').textContent = username;
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('main-content').style.display = 'flex';
            
            // Inicializar fecha
            document.getElementById('date-selector-input').value = getTodayDateKey();
            
            // Revisa si es un nuevo día para archivar
            checkAndRollDay();
            
            // Mostrar módulo inicial
            const initialLink = document.querySelector('.nav-item-neon.active');
            if (initialLink) {
                showModule(initialLink.dataset.module, initialLink);
            }
        }
        
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.toggle('open');
            }
        }
        
        window.showModule = function(moduleId, linkElement) {
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }

            document.querySelectorAll('.module-content').forEach(el => {
                el.style.display = 'none';
            });

            const moduleToShow = document.getElementById(`module-${moduleId}`);
            if (moduleToShow) {
                moduleToShow.style.display = 'block';
            }

            const moduleTitle = document.getElementById('module-title');
            const fullLinkText = linkElement.textContent.trim();
            const bracketIndex = fullLinkText.indexOf('(');
            const subTitle = bracketIndex > -1 ? fullLinkText.substring(bracketIndex).replace('(', '').replace(')', '').trim() : '';
            moduleTitle.textContent = `MÓDULO: ${moduleId} ${subTitle ? '(' + subTitle + ')' : ''}`;

            document.querySelectorAll('.nav-item-neon').forEach(link => {
                link.classList.remove('active');
            });
            linkElement.classList.add('active');
            
            if (moduleId === 'TRABAJO') {
                initializeTrabajoModule();
            } else if (moduleId === 'FOCO') {
                initializeFocoModule();
            } else if (moduleId === 'FINANZAS') {
                initializeFinanzasModule();
            } else if (moduleId === 'RECURSOS') {
                initializeRecursosModule();
            }
        }
        
        window.handleDateChange = function(newDateKey) {
            currentViewingDateKey = newDateKey;
            
            const todayKey = getTodayDateKey();
            isHistoryMode = newDateKey !== todayKey;
            
            const viewModeDisplay = document.getElementById('view-mode-display');
            if (viewModeDisplay) {
                viewModeDisplay.textContent = isHistoryMode ? 'Historial' : 'Hoy';
                viewModeDisplay.classList.toggle('bg-green-600/50', !isHistoryMode);
                viewModeDisplay.classList.toggle('bg-yellow-600/50', isHistoryMode);
                viewModeDisplay.classList.toggle('text-white', true);
            }
            
            // Mostrar alerta de historial en finanzas si aplica
            const financeAlert = document.getElementById('finance-history-alert');
            if (financeAlert) {
                financeAlert.style.display = isHistoryMode && document.getElementById('module-FINANZAS').style.display !== 'none' ? 'block' : 'none';
            }

            const activeLink = document.querySelector('.nav-item-neon.active');
            if (activeLink) {
                // Forzar la recarga del módulo activo para cargar la data correcta
                showModule(activeLink.dataset.module, activeLink); 
            }
        }

        window.handleLogout = function() { localStorage.removeItem(CURRENT_USER_KEY); window.location.href = 'login.html'; };
        
        function showNotification(message, type = 'info') { 
            console.log(`[NOTIFICACIÓN ${type.toUpperCase()}]:`, message); 
            // Implementación simple de alert, reemplazando la función original
            const alertBox = document.createElement('div');
            alertBox.className = `fixed top-5 right-5 p-4 rounded-lg shadow-xl text-white z-50 transition-transform transform translate-x-0 ${type === 'success' ? 'bg-green-700' : type === 'error' ? 'bg-red-700' : 'bg-blue-700'}`;
            alertBox.textContent = message;
            document.body.appendChild(alertBox);
            setTimeout(() => {
                alertBox.classList.add('translate-x-full');
                alertBox.addEventListener('transitionend', () => alertBox.remove());
            }, 3000);
        }
        
        // Función de utilidad para generar colores neón
        function getNeonColor(index) {
            const colors = [
                { color: '#00E0FF', border: 'rgba(0, 224, 255, 0.6)' },  // Cyan
                { color: '#FF4141', border: 'rgba(255, 65, 65, 0.6)' },   // Red
                { color: '#FBBF24', border: 'rgba(251, 191, 36, 0.6)' },  // Yellow
                { color: '#10B981', border: 'rgba(16, 185, 129, 0.6)' },  // Green
                { color: '#A78BFA', border: 'rgba(167, 139, 250, 0.6)' }, // Purple
                { color: '#FF00FF', border: 'rgba(255, 0, 255, 0.6)' },   // Magenta
                { color: '#FFD700', border: 'rgba(255, 215, 0, 0.6)' }    // Gold
            ];
            return colors[index % colors.length];
        }

        // Función de utilidad para formatear tiempo
        function formatTime(totalSeconds) {
            const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            const s = String(totalSeconds % 60).padStart(2, '0');
            return `${h}:${m}:${s}`;
        }
        
        function formatMinutes(minutes) {
             const h = String(Math.floor(minutes / 60)).padStart(2, '0');
             const m = String(Math.floor(minutes % 60)).padStart(2, '0');
             return `${h}:${m}`;
        }

        // --- LÓGICA DE ARCHIVO Y ROLL-OVER ---
        function checkAndRollDay() {
            const todayKey = getTodayDateKey();
            const lastRollDate = localStorage.getItem('chronos_last_roll_date');
            if (!lastRollDate) { localStorage.setItem('chronos_last_roll_date', todayKey); return; }
            if (lastRollDate !== todayKey) {
                showNotification(`¡El día ha cambiado! Archivando datos del ${lastRollDate}...`, 'info');
                archivePreviousDayData(lastRollDate);
                localStorage.setItem('chronos_last_roll_date', todayKey);
            }
        }
        function archivePreviousDayData(previousDayKey) {
            // 1. Archivar Métricas de TRABAJO
            const currentMetrics = JSON.parse(localStorage.getItem('chronos_metrics') || '{}');
            const metricsHistory = JSON.parse(localStorage.getItem('chronos_metrics_history') || '{}');
            if (Object.keys(currentMetrics).length > 0) {
                metricsHistory[previousDayKey] = currentMetrics;
                localStorage.setItem('chronos_metrics_history', JSON.stringify(metricsHistory));
            }
            localStorage.removeItem('chronos_metrics'); 
            localStorage.removeItem('chronos_targets'); 
            
            // 2. Archivar Tareas de FOCO
            const currentTasks = JSON.parse(localStorage.getItem('chronos_tasks') || '[]');
            const tasksHistory = JSON.parse(localStorage.getItem('chronos_tasks_history') || '{}');
            if (currentTasks.length > 0) {
                tasksHistory[previousDayKey] = currentTasks;
                localStorage.setItem('chronos_tasks_history', JSON.stringify(tasksHistory));
            }
            localStorage.removeItem('chronos_tasks'); 
            
            // 3. Resetear contadores
            localStorage.removeItem('chronos_seconds');
            localStorage.removeItem('chronos_is_timing');
            localStorage.removeItem('chronos_current_aux');
            localStorage.removeItem('chronos_pomo_seconds');
            localStorage.removeItem('chronos_pomo_running');
            localStorage.removeItem('chronos_pomo_state');
            localStorage.removeItem('chronos_pomo_active_task'); 
            localStorage.removeItem('chronos_pomo_cycle'); 
            localStorage.removeItem('chronos_pomo_count'); 

            showNotification(`Datos del ${previousDayKey} archivados correctamente. ¡Empezando nuevo día!`, 'success');
        }


        // --- LÓGICA DEL MÓDULO TRABAJO (FASE 8 - Métricas mejoradas) ---
        let currentAUX;
        let currentMetrics;
        let seconds;
        let isTiming;
        let currentTargets = {}; 
        let timerInterval;

        function initializeTrabajoModule() {
            setupTrabajoDOMElements();
            loadTrabajoData();
            initializeAUXSelector();
            renderMetricsDisplay();
            renderTargetDisplay();
            updateTimerDisplay();
            
            const timerToggleBtn = document.getElementById('btn-timer-toggle');

            if (!isHistoryMode) {
                if (isTiming) {
                    startTimer();
                } else {
                    clearInterval(timerInterval);
                }
                timerToggleBtn.disabled = false;
                timerToggleBtn.innerHTML = isTiming ? `<span data-lucide="pause" class="w-6 h-6 inline-block me-2"></span> PAUSAR ${currentAUX.toUpperCase()}` : `<span data-lucide="play" class="w-6 h-6 inline-block me-2"></span> INICIAR TRABAJO`;
            } else {
                clearInterval(timerInterval);
                timerToggleBtn.disabled = true;
                timerToggleBtn.textContent = 'HISTORIAL (NO EDITABLE)';
            }
            lucide.createIcons();
        }

        function setupTrabajoDOMElements() {
             // Asignación de event listeners y elementos DOM
             document.getElementById('btn-timer-toggle').onclick = toggleTimer;
             document.getElementById('btn-quicklog').onclick = addQuickLog;
        }

        function loadTrabajoData() {
            if (isHistoryMode) {
                const metricsHistory = JSON.parse(localStorage.getItem('chronos_metrics_history') || '{}');
                currentMetrics = metricsHistory[currentViewingDateKey] || JSON.parse(JSON.stringify(METRICS_INITIAL));
                currentTargets = {}; 
                currentAUX = 'offline';
                seconds = 0;
                isTiming = false;
            } else {
                currentMetrics = JSON.parse(localStorage.getItem('chronos_metrics')) || JSON.parse(JSON.stringify(METRICS_INITIAL));
                currentAUX = localStorage.getItem('chronos_current_aux') || 'ready';
                seconds = parseInt(localStorage.getItem('chronos_seconds') || 0);
                isTiming = localStorage.getItem('chronos_is_timing') === 'true';
                currentTargets = JSON.parse(localStorage.getItem('chronos_targets') || '{}');
            }
        }
        
        function updateMetrics(aux, duration) {
            if (currentMetrics[aux]) {
                currentMetrics[aux].time += duration;
                if (INTERACTION_STATES.includes(aux)) {
                    currentMetrics[aux].count = (currentMetrics[aux].count || 0) + 1; // Solo contamos interacciones para los AUX principales
                }
            } else {
                currentMetrics[aux] = { time: duration, count: INTERACTION_STATES.includes(aux) ? 1 : 0 };
            }
            localStorage.setItem('chronos_metrics', JSON.stringify(currentMetrics));
        }
        
        function startTimer() {
             if (timerInterval) clearInterval(timerInterval);
             timerInterval = setInterval(() => {
                 seconds++;
                 updateTimerDisplay();
             }, 1000);
        }
        
        function updateTimerDisplay() {
            document.getElementById('main-timer').textContent = formatTime(seconds);
            document.getElementById('current-aux-display').textContent = currentAUX.toUpperCase();
            
            // Actualizar métricas y targets en tiempo real
            if (isTiming && seconds % 10 === 0) {
                 renderMetricsDisplay();
                 renderTargetDisplay();
            }
        }
        
        window.setAUX = function(newAux) {
            if (isHistoryMode || currentAUX === newAux) return;

            const wasTiming = isTiming;
            const previousAux = currentAUX;
            
            // Pausar el cronómetro (si estaba corriendo) y loggear el tiempo del estado anterior
            if (wasTiming && seconds > 0) {
                clearInterval(timerInterval);
                updateMetrics(previousAux, seconds);
                seconds = 0;
            }
            
            currentAUX = newAux;
            localStorage.setItem('chronos_current_aux', currentAUX);
            
            // Manejo de la lógica del cronómetro principal
            if (INTERACTION_STATES.includes(newAux) && wasTiming) {
                // Si cambiamos entre estados de INTERACCIÓN y el timer estaba corriendo
                isTiming = true;
                localStorage.setItem('chronos_is_timing', 'true');
                startTimer();
                document.getElementById('btn-timer-toggle').innerHTML = `<span data-lucide="pause" class="w-6 h-6 inline-block me-2"></span> PAUSAR ${currentAUX.toUpperCase()}`;
            } else if (!INTERACTION_STATES.includes(newAux) && wasTiming) {
                // Si estaba corriendo y pasa a un estado NO INTERACTIVO (break, lunch, ready, offline)
                isTiming = false;
                localStorage.setItem('chronos_is_timing', 'false');
                document.getElementById('btn-timer-toggle').innerHTML = `<span data-lucide="play" class="w-6 h-6 inline-block me-2"></span> REANUDAR TRABAJO`;
                document.getElementById('main-timer').textContent = '00:00:00';
            } else if (!wasTiming) {
                // Si el cronómetro estaba detenido, se mantiene detenido.
                isTiming = false;
                localStorage.setItem('chronos_is_timing', 'false');
                document.getElementById('btn-timer-toggle').innerHTML = `<span data-lucide="play" class="w-6 h-6 inline-block me-2"></span> INICIAR TRABAJO`;
                document.getElementById('main-timer').textContent = '00:00:00';
            }
            
            updateTimerDisplay();
            renderMetricsDisplay();
            renderTargetDisplay(); 
            initializeAUXSelector(); // Para actualizar el botón activo
            lucide.createIcons();
        }

        window.toggleTimer = function() {
            if (isHistoryMode) return;
            
            if (isTiming) {
                // Pausar
                clearInterval(timerInterval);
                if (seconds > 0) updateMetrics(currentAUX, seconds); 
                seconds = 0; 
                isTiming = false;
                localStorage.setItem('chronos_is_timing', 'false');
                document.getElementById('btn-timer-toggle').innerHTML = `<span data-lucide="play" class="w-6 h-6 inline-block me-2"></span> REANUDAR TRABAJO`;
                document.getElementById('main-timer').textContent = '00:00:00';
            } else {
                // Iniciar
                if (!INTERACTION_STATES.includes(currentAUX)) {
                    // Si no está en un AUX de interacción, forzarlo a 'voice' (o el primero de INTERACTION_STATES)
                    setAUX(INTERACTION_STATES[0]); 
                }
                
                isTiming = true;
                localStorage.setItem('chronos_is_timing', 'true');
                document.getElementById('btn-timer-toggle').innerHTML = `<span data-lucide="pause" class="w-6 h-6 inline-block me-2"></span> PAUSAR ${currentAUX.toUpperCase()}`;
                startTimer();
            }
             lucide.createIcons();
        }
        
        function initializeAUXSelector() {
             const selector = document.getElementById('aux-selector');
             selector.innerHTML = '';
             
             AUX_STATES.forEach(aux => {
                 const isActive = aux === currentAUX && !isHistoryMode;
                 const isInteraction = INTERACTION_STATES.includes(aux);
                 const button = document.createElement('button');
                 
                 button.className = `py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
                     isActive ? 'btn-neon' : 
                     isInteraction ? 'bg-cyan-700/50 hover:bg-cyan-600/50 text-white' :
                     'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
                 }`;
                 button.textContent = aux.toUpperCase();
                 button.onclick = () => setAUX(aux);
                 button.disabled = isHistoryMode;
                 selector.appendChild(button);
             });
        }
        
        function renderMetricsDisplay() {
            const display = document.getElementById('metrics-display');
            display.innerHTML = '';
            
            let totalTime = 0;
            let interactionCount = 0;
            
            // Agrupar métricas por tipo
            const interactionMetrics = {};
            const nonInteractionMetrics = {};

            Object.keys(currentMetrics).forEach(aux => {
                const metric = currentMetrics[aux];
                totalTime += metric.time;
                if (INTERACTION_STATES.includes(aux)) {
                    interactionCount += metric.count;
                    interactionMetrics[aux] = metric;
                } else if (ALL_TIME_TRACKED_STATES.includes(aux)) {
                    nonInteractionMetrics[aux] = metric;
                }
            });
            
            // Renderizar tiempo total
            display.innerHTML += `<div class="mb-3 p-3 bg-gray-800/50 rounded-lg">
                <p class="text-xs text-gray-400">TIEMPO TOTAL LOGGEADO:</p>
                <p class="text-2xl font-bold text-neon">${formatTime(totalTime)}</p>
                <p class="text-xs text-gray-400 mt-2">INTERACCIONES PRINCIPALES: <span class="text-white font-bold">${interactionCount}</span></p>
            </div>`;
            
            // Renderizar desglose de Interacción
            display.innerHTML += `<h4 class="text-sm text-cyan-400 font-semibold mb-2 mt-4 border-b border-gray-700 pb-1">Desglose Interacción (Segundos/Minutos):</h4>`;
            
            Object.keys(interactionMetrics).sort().forEach(aux => {
                 const metric = interactionMetrics[aux];
                 const minutes = Math.floor(metric.time / 60);
                 const minutesDisplay = minutes > 0 ? `${minutes}m` : `${metric.time}s`;

                 display.innerHTML += `<div class="flex justify-between items-center text-sm py-1">
                     <span class="text-white font-mono">${aux.toUpperCase()}</span>
                     <span class="text-cyan-300 font-bold">${minutesDisplay} (${metric.count}x)</span>
                 </div>`;
            });
            
             // Renderizar desglose No Interactivo
            display.innerHTML += `<h4 class="text-sm text-gray-400 font-semibold mb-2 mt-4 border-b border-gray-700 pb-1">Tiempos Auxiliares:</h4>`;
            
            Object.keys(nonInteractionMetrics).sort().forEach(aux => {
                 const metric = nonInteractionMetrics[aux];
                 if (metric.time > 0) {
                     const minutes = Math.floor(metric.time / 60);
                     const hours = Math.floor(minutes / 60);
                     const remainingMinutes = minutes % 60;
                     const timeDisplay = hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;

                     display.innerHTML += `<div class="flex justify-between items-center text-sm py-1">
                         <span class="text-gray-500 font-mono">${aux.toUpperCase()}</span>
                         <span class="text-gray-400 font-bold">${timeDisplay}</span>
                     </div>`;
                 }
            });
        }
        
        // --- LÓGICA DE OBJETIVOS (TARGETS) ---
        
        window.showTargetModal = function() {
            const targetInputsContainer = document.getElementById('target-inputs');
            targetInputsContainer.innerHTML = '';
            
            INTERACTION_STATES.forEach(aux => {
                const currentMinTarget = currentTargets[aux] || 0;
                
                const inputGroup = document.createElement('div');
                inputGroup.className = 'flex items-center justify-between mb-3';
                inputGroup.innerHTML = `
                    <label class="text-white font-semibold w-1/3">${aux.toUpperCase()} (Min.):</label>
                    <input type="number" id="target-input-${aux}" value="${currentMinTarget}" min="0" class="w-2/3 p-2 rounded-lg bg-gray-700/50 border border-cyan-400/30 text-white">
                `;
                targetInputsContainer.appendChild(inputGroup);
            });

            const modalEl = document.getElementById('targetModal');
            new bootstrap.Modal(modalEl).show();
        }
        
        window.saveTargets = function() {
            const newTargets = {};
            INTERACTION_STATES.forEach(aux => {
                const input = document.getElementById(`target-input-${aux}`);
                if (input) {
                    newTargets[aux] = parseInt(input.value) || 0;
                }
            });
            
            currentTargets = newTargets;
            localStorage.setItem('chronos_targets', JSON.stringify(currentTargets));
            renderTargetDisplay();
            
            // Cerrar modal
            const modalEl = document.getElementById('targetModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) {
                modalInstance.hide();
            }
            showNotification('Objetivos diarios guardados.', 'success');
        }
        
        function renderTargetDisplay() {
            const display = document.getElementById('target-display');
            display.innerHTML = '';
            
            if (Object.keys(currentTargets).length === 0) {
                 display.innerHTML = `<p class="text-gray-400">No hay objetivos configurados. Usa el botón de abajo.</p>`;
                 return;
            }
            
            let overallProgress = 0;
            let totalTargetMinutes = 0;
            let totalAchievedMinutes = 0;
            
            INTERACTION_STATES.forEach(aux => {
                const targetMin = currentTargets[aux] || 0;
                const achievedSec = currentMetrics[aux]?.time || 0;
                const achievedMin = Math.floor(achievedSec / 60);
                
                if (targetMin > 0) {
                    totalTargetMinutes += targetMin;
                    totalAchievedMinutes += Math.min(achievedMin, targetMin); // Para el progreso total solo se cuenta hasta el 100%
                    
                    const progress = Math.min(100, (achievedMin / targetMin) * 100);
                    const progressColor = progress >= 100 ? 'bg-green-500' : 'bg-cyan-500';
                    
                    display.innerHTML += `
                        <div class="mb-3">
                            <div class="flex justify-between text-xs mb-1">
                                <span class="font-semibold text-white">${aux.toUpperCase()}</span>
                                <span class="text-gray-400">${achievedMin} / ${targetMin} min</span>
                            </div>
                            <div class="w-full bg-gray-700 rounded-full h-2.5">
                                <div class="h-2.5 rounded-full ${progressColor} transition-all duration-500" style="width: ${progress}%;"></div>
                            </div>
                        </div>
                    `;
                }
            });
            
            if (totalTargetMinutes > 0) {
                 overallProgress = (totalAchievedMinutes / totalTargetMinutes) * 100;
                 const overallColor = overallProgress >= 100 ? 'text-green-400' : 'text-cyan-400';
                 
                 display.innerHTML += `<div class="mt-4 pt-3 border-t border-gray-700">
                     <div class="flex justify-between text-sm font-bold">
                         <span class="text-white">PROGRESO TOTAL:</span>
                         <span class="${overallColor}">${Math.min(100, overallProgress).toFixed(0)}%</span>
                     </div>
                 </div>`;
            } else if (Object.keys(currentTargets).some(k => currentTargets[k] > 0)) {
                 // Si hay targets > 0 pero el totalTargetMinutes sigue siendo 0 (debería ser imposible si el loop se ejecuta)
            } else {
                 display.innerHTML = `<p class="text-gray-400">No hay objetivos configurados. Usa el botón de abajo.</p>`;
            }
        }
        
        window.addQuickLog = function() {
            if (isHistoryMode) {
                 showNotification("No se puede añadir un Quick-Log en modo historial.", 'error');
                 return;
            }
            const description = document.getElementById('quicklog-input').value.trim();
            const durationMin = parseInt(document.getElementById('quicklog-duration').value);
            
            if (!description || isNaN(durationMin) || durationMin <= 0 || durationMin > 10) {
                 showNotification("Quick-Log requiere descripción y una duración válida (1-10 minutos).", 'error');
                 return;
            }
            
            const durationSec = durationMin * 60;
            
            // Asignar el quicklog al primer estado de interacción
            const logAux = INTERACTION_STATES[0];
            updateMetrics(logAux, durationSec);
            
            showNotification(`Quick-Log registrado: ${durationMin} min para '${description}'.`, 'success');
            
            document.getElementById('quicklog-input').value = '';
            document.getElementById('quicklog-duration').value = '';
            
            renderMetricsDisplay();
            renderTargetDisplay();
        }

        // --- LÓGICA DE FOCO (FASE 8 - Recordatorios y Kanban) ---
        let tasks = [];
        let pomoIsRunning;
        let pomoSeconds;
        let pomoState; // 'focus', 'break', 'long_break'
        let pomoActiveTaskID; 
        let pomoInterval;
        let pomoCycle = 0; // Para el ciclo de Pomodoro (1-4)
        let pomoCount = 0; // Contador de Pomodoros completados en el día

        function loadFocoData() {
            if (isHistoryMode) {
                const tasksHistory = JSON.parse(localStorage.getItem('chronos_tasks_history') || '{}');
                tasks = tasksHistory[currentViewingDateKey] || [];
            } else {
                tasks = JSON.parse(localStorage.getItem('chronos_tasks') || '[]');
                pomoIsRunning = localStorage.getItem('chronos_pomo_running') === 'true';
                pomoSeconds = parseInt(localStorage.getItem('chronos_pomo_seconds') || POMODORO_FOCUS_DURATION);
                pomoState = localStorage.getItem('chronos_pomo_state') || 'focus';
                pomoActiveTaskID = localStorage.getItem('chronos_pomo_active_task') || null;
                pomoCycle = parseInt(localStorage.getItem('chronos_pomo_cycle') || 0);
                pomoCount = parseInt(localStorage.getItem('chronos_pomo_count') || 0);
            }
        }
        
        function initializeFocoModule() {
            loadFocoData();
            renderTasks();
            updatePomoDisplay();
            
            const pomoToggleBtn = document.getElementById('btn-pomodoro-toggle');

            if (!isHistoryMode) {
                if (pomoIsRunning) {
                    startPomodoroTimer();
                } else {
                    clearInterval(pomoInterval);
                }
                pomoToggleBtn.disabled = false;
            } else {
                 clearInterval(pomoInterval);
                 pomoToggleBtn.disabled = true;
            }

            // Asignación de event listeners
            document.getElementById('btn-add-task').onclick = addTask;
            document.getElementById('btn-pomodoro-toggle').onclick = togglePomodoro;
            document.getElementById('btn-pomodoro-reset').onclick = resetPomodoro;
            document.getElementById('btn-pomodoro-skip').onclick = skipPomodoro;
        }

        function addTask() {
            if (isHistoryMode) return;
            
            const text = document.getElementById('task-input').value.trim();
            const plazo = document.getElementById('task-plazo').value;
            const priority = document.getElementById('task-priority').value; 
            const effort = parseInt(document.getElementById('task-effort').value) || 0; 
            const reminderDate = document.getElementById('task-reminder-date').value || null;

            if (text) {
                const newTask = { 
                    id: Date.now().toString(), 
                    text: text, 
                    plazo: plazo, 
                    priority: priority, 
                    effort: effort, 
                    pomodoros: 0, 
                    reminderDate: reminderDate, 
                    completed: false,
                    dateAdded: getTodayDateKey()
                };
                tasks.push(newTask);
                localStorage.setItem('chronos_tasks', JSON.stringify(tasks));
                
                document.getElementById('task-input').value = '';
                document.getElementById('task-effort').value = '';
                document.getElementById('task-reminder-date').value = '';

                renderTasks();
                showNotification(`Tarea '${text}' añadida.`, 'success');
            } else {
                showNotification("El título de la tarea no puede estar vacío.", 'error');
            }
        }
        
        window.completeTask = function(taskId) {
            if (isHistoryMode) return;
            
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                const task = tasks[taskIndex];
                if (confirm(`¿Marcar la tarea '${task.text}' como completada?`)) {
                    task.completed = true;
                    // Mover la tarea a su historial o simplemente eliminarla de la lista activa
                    tasks.splice(taskIndex, 1);
                    localStorage.setItem('chronos_tasks', JSON.stringify(tasks));
                    
                    if (pomoActiveTaskID === taskId) {
                        pomoActiveTaskID = null;
                        localStorage.removeItem('chronos_pomo_active_task');
                        document.getElementById('current-task-display').querySelector('span').textContent = 'Ninguna';
                    }

                    renderTasks();
                    showNotification(`Tarea '${task.text}' completada. ¡Buen trabajo!`, 'success');
                }
            }
        }
        
        window.deleteTask = function(taskId) {
             if (isHistoryMode) return;
             
             const taskIndex = tasks.findIndex(t => t.id === taskId);
             if (taskIndex !== -1) {
                 const task = tasks[taskIndex];
                 if (confirm(`¿Estás seguro de que quieres ELIMINAR permanentemente la tarea '${task.text}'?`)) {
                     tasks.splice(taskIndex, 1);
                     localStorage.setItem('chronos_tasks', JSON.stringify(tasks));

                     if (pomoActiveTaskID === taskId) {
                         pomoActiveTaskID = null;
                         localStorage.removeItem('chronos_pomo_active_task');
                         document.getElementById('current-task-display').querySelector('span').textContent = 'Ninguna';
                     }
                     renderTasks();
                     showNotification(`Tarea eliminada.`, 'info');
                 }
             }
        }

        window.drag = function(event) {
            event.dataTransfer.setData("text", event.target.id);
            // Almacenar el ID de la tarea
            event.dataTransfer.setData("taskId", event.target.id.replace('task-', '')); 
        }

        window.allowDrop = function(event) {
            event.preventDefault();
        }

        window.drop = function(event) {
            event.preventDefault();
            const taskId = event.dataTransfer.getData("taskId");
            const targetColumn = event.currentTarget.dataset.plazoTarget;
            
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            
            if (taskIndex !== -1) {
                tasks[taskIndex].plazo = targetColumn;
                localStorage.setItem('chronos_tasks', JSON.stringify(tasks));
                renderTasks();
                showNotification(`Tarea movida a ${targetColumn.toUpperCase()}.`, 'info');
            }
        }
        
        function renderTasks() {
            const todayKey = getTodayDateKey();
            const listEls = { inbox: [], corto: [], mediano: [], largo: [] };

            const currentTasks = isHistoryMode ? 
                (JSON.parse(localStorage.getItem('chronos_tasks_history') || '{}')[currentViewingDateKey] || []) :
                tasks;
            
            currentTasks.sort((a, b) => {
                // Ordenar por prioridad (Alta > Media > Baja)
                const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });

            currentTasks.forEach(task => {
                if (task.completed) return; 

                // Lógica de recordatorio vencido
                let reminderBadge = '';
                if (task.reminderDate && task.reminderDate < todayKey) {
                    reminderBadge = `<span class="reminder-badge">VENCIDO (${task.reminderDate})</span>`;
                }

                const priorityClass = `priority-${task.priority}`;
                const isActivePomo = !isHistoryMode && pomoActiveTaskID === task.id;
                
                const taskHtml = `
                    <div id="task-${task.id}" class="kanban-card p-3 rounded-lg text-sm bg-gray-900/50 border ${isActivePomo ? 'border-red-500 shadow-lg shadow-red-500/30' : 'border-gray-700' } cursor-pointer" 
                         draggable="true" ondragstart="drag(event)" ondblclick="${!isHistoryMode ? `setActivePomodoroTask('${task.id}')` : ''}">
                        <div class="flex justify-between items-start mb-1">
                            <span class="text-white font-semibold">${task.text}</span>
                            <div class="flex-shrink-0 flex items-center">
                                ${reminderBadge}
                                ${!isHistoryMode ? `
                                    <button class="ms-2 ${isActivePomo ? 'text-red-500' : 'text-gray-500'}" onclick="event.stopPropagation(); setActivePomodoroTask('${task.id}')" title="${isActivePomo ? 'Activa' : 'Poner en Foco'}">
                                        <span data-lucide="${isActivePomo ? 'bolt' : 'zap'}" class="w-4 h-4"></span>
                                    </button>
                                    <button class="ms-2 text-green-400 hover:text-green-600" onclick="event.stopPropagation(); completeTask('${task.id}')" title="Completar">
                                        <span data-lucide="check-square" class="w-4 h-4"></span>
                                    </button>
                                    <button class="ms-2 text-red-400 hover:text-red-600" onclick="event.stopPropagation(); deleteTask('${task.id}')" title="Eliminar">
                                        <span data-lucide="trash-2" class="w-4 h-4"></span>
                                    </button>
                                `: ''}
                            </div>
                        </div>
                        <div class="flex justify-start text-xs text-gray-400">
                            <span class="font-bold uppercase ${priorityClass} px-1 rounded">${task.priority}</span>
                            <span class="ms-2">Esfuerzo: ${task.effort || 0}h | Foco: ${task.pomodoros || 0}🍅</span>
                        </div>
                    </div>
                `;
                if (listEls[task.plazo]) {
                    listEls[task.plazo].push(taskHtml);
                }
            });

            // Renderizar las listas en el DOM
            Object.keys(listEls).forEach(plazo => {
                const listEl = document.getElementById(`tasks-list-${plazo}`);
                if (listEl) {
                    listEl.innerHTML = listEls[plazo].join('');
                }
            });
            lucide.createIcons();
        }
        
        // Lógica de Pomodoro
        window.setActivePomodoroTask = function(taskId) {
            if (isHistoryMode) return;
            
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;
            
            pomoActiveTaskID = taskId;
            localStorage.setItem('chronos_pomo_active_task', pomoActiveTaskID);
            
            document.getElementById('current-task-display').querySelector('span').textContent = task.text;
            renderTasks(); // Para actualizar el resaltado en Kanban
            showNotification(`Tarea '${task.text}' marcada como activa para Pomodoro.`, 'info');
        }
        
        function togglePomodoro() {
            if (isHistoryMode) return;

            if (!pomoActiveTaskID && !pomoIsRunning) {
                showNotification("Selecciona una tarea de la Matriz Kanban para iniciar el Pomodoro.", 'error');
                return;
            }
            
            pomoIsRunning = !pomoIsRunning;
            localStorage.setItem('chronos_pomo_running', pomoIsRunning);
            
            if (pomoIsRunning) {
                startPomodoroTimer();
            } else {
                clearInterval(pomoInterval);
            }
            updatePomoDisplay();
        }
        
        function startPomodoroTimer() {
             if (pomoInterval) clearInterval(pomoInterval);
             
             pomoInterval = setInterval(() => {
                 pomoSeconds--;
                 
                 if (pomoSeconds < 0) {
                     handlePomodoroCompletion();
                 }
                 updatePomoDisplay();
             }, 1000);
        }
        
        function handlePomodoroCompletion() {
            clearInterval(pomoInterval);
            
            if (pomoState === 'focus') {
                // Foco terminado
                pomoCount++;
                pomoCycle = (pomoCycle % 4) + 1;
                
                // Actualizar la tarea
                const taskIndex = tasks.findIndex(t => t.id === pomoActiveTaskID);
                if (taskIndex !== -1) {
                    tasks[taskIndex].pomodoros++;
                    localStorage.setItem('chronos_tasks', JSON.stringify(tasks));
                    renderTasks();
                }

                // Determinar el siguiente estado
                if (pomoCycle === 4) {
                    pomoState = 'long_break';
                    pomoSeconds = POMODORO_LONG_BREAK_DURATION;
                    showNotification(`¡Ciclo de Foco completado! Tomate un DESCANSO LARGO (${formatMinutes(pomoSeconds / 60)}).`, 'success');
                } else {
                    pomoState = 'break';
                    pomoSeconds = POMODORO_BREAK_DURATION;
                    showNotification(`¡Pomodoro completado! Tomate un descanso corto (${formatMinutes(pomoSeconds / 60)}).`, 'success');
                }
                
                // Loggear el pomodoro completado para análisis
                logPomodoroCompletion(); 
                
            } else {
                // Descanso terminado
                pomoState = 'focus';
                pomoSeconds = POMODORO_FOCUS_DURATION;
                showNotification(`El descanso terminó. Vuelve al FOCO (${formatMinutes(pomoSeconds / 60)}).`, 'info');
                
                // Si la tarea activa se completó durante el break, pedimos que seleccione una nueva
                if (!pomoActiveTaskID || !tasks.find(t => t.id === pomoActiveTaskID)) {
                     pomoActiveTaskID = null;
                     localStorage.removeItem('chronos_pomo_active_task');
                     showNotification("Selecciona una nueva tarea antes de iniciar el siguiente Foco.", 'error');
                }
            }
            
            pomoIsRunning = false;
            localStorage.setItem('chronos_pomo_state', pomoState);
            localStorage.setItem('chronos_pomo_cycle', pomoCycle);
            localStorage.setItem('chronos_pomo_count', pomoCount);
            localStorage.setItem('chronos_pomo_seconds', pomoSeconds);
            localStorage.setItem('chronos_pomo_running', 'false');
            
            updatePomoDisplay();
        }
        
        function logPomodoroCompletion() {
            const pomoLog = JSON.parse(localStorage.getItem('chronos_pomodoro_log') || '[]');
            pomoLog.push({ date: getTodayDateKey(), time: new Date().toISOString() });
            localStorage.setItem('chronos_pomodoro_log', JSON.stringify(pomoLog));
        }

        function resetPomodoro() {
            if (isHistoryMode) return;
            
            clearInterval(pomoInterval);
            pomoIsRunning = false;
            pomoState = 'focus';
            pomoSeconds = POMODORO_FOCUS_DURATION;
            pomoActiveTaskID = null;
            pomoCycle = 0;
            
            localStorage.removeItem('chronos_pomo_running');
            localStorage.removeItem('chronos_pomo_state');
            localStorage.removeItem('chronos_pomo_seconds');
            localStorage.removeItem('chronos_pomo_active_task');
            localStorage.removeItem('chronos_pomo_cycle');
            
            updatePomoDisplay();
            renderTasks();
            showNotification("Pomodoro reiniciado.", 'info');
        }
        
        function skipPomodoro() {
            if (isHistoryMode) return;
            
            const nextState = pomoState === 'focus' ? 'break' : 'focus';
            
            // Si saltamos un foco, no contamos el pomodoro completado, pero loggeamos el tiempo trabajado
            if (pomoState === 'focus') {
                 // Loggear el tiempo trabajado como AUX de training (estimación)
                 const elapsedSec = POMODORO_FOCUS_DURATION - pomoSeconds;
                 if (elapsedSec > 0) {
                      updateMetrics('training', elapsedSec);
                 }
                 pomoCycle = (pomoCycle % 4) + 1; // Avanzamos el ciclo
            }

            clearInterval(pomoInterval);
            pomoIsRunning = false;
            
            pomoState = nextState;
            pomoSeconds = (pomoState === 'focus' ? POMODORO_FOCUS_DURATION : (pomoCycle === 4 ? POMODORO_LONG_BREAK_DURATION : POMODORO_BREAK_DURATION));

            localStorage.setItem('chronos_pomo_state', pomoState);
            localStorage.setItem('chronos_pomo_cycle', pomoCycle);
            localStorage.setItem('chronos_pomo_seconds', pomoSeconds);
            localStorage.setItem('chronos_pomo_running', 'false');

            updatePomoDisplay();
            showNotification(`Estado saltado. Siguiente: ${pomoState.toUpperCase()}.`, 'info');
        }

        function updatePomoDisplay() {
            const minutes = Math.floor(pomoSeconds / 60);
            const secondsLeft = pomoSeconds % 60;
            const formattedTime = `${String(minutes).padStart(2, '0')}:${String(secondsLeft).padStart(2, '0')}`;
            
            document.getElementById('pomodoro-timer').textContent = formattedTime;
            
            const statusEl = document.getElementById('pomodoro-status').querySelector('span');
            const toggleBtn = document.getElementById('btn-pomodoro-toggle');
            
            statusEl.textContent = pomoState.toUpperCase();
            
            if (pomoIsRunning) {
                toggleBtn.innerHTML = `<span data-lucide="pause" class="w-5 h-5 inline-block me-2"></span> PAUSAR ${pomoState.toUpperCase()}`;
                toggleBtn.classList.remove('btn-danger');
                toggleBtn.classList.add('btn-secondary', 'bg-gray-600/50');
            } else {
                toggleBtn.innerHTML = `<span data-lucide="play" class="w-5 h-5 inline-block me-2"></span> INICIAR ${pomoState.toUpperCase()}`;
                toggleBtn.classList.add('btn-danger');
                toggleBtn.classList.remove('btn-secondary', 'bg-gray-600/50');
            }
            
            const taskDisplay = document.getElementById('current-task-display').querySelector('span');
            const activeTask = tasks.find(t => t.id === pomoActiveTaskID);
            taskDisplay.textContent = activeTask ? activeTask.text : 'Ninguna';
            
            lucide.createIcons();
        }

        // --- LÓGICA DE FINANZAS (FASE 8 - Multi-Cuenta) ---
        let accounts = [];
        let transactions = [];
        let currentAccountID = 'TOTAL';

        function initializeFinanzasModule() {
            setupFinanzasDOMElements();
            loadFinanzasData();
            renderAccountsDropdown(); 
            updateCategoryOptions(document.getElementById('finance-type').value);
            renderFinanzas();
            
            // Mostrar alerta de historial si aplica al entrar al módulo
            const financeAlert = document.getElementById('finance-history-alert');
            if (financeAlert) {
                financeAlert.style.display = isHistoryMode ? 'block' : 'none';
            }
        }

        function setupFinanzasDOMElements() {
            document.getElementById('finance-type').onchange = (e) => updateCategoryOptions(e.target.value);
            document.getElementById('btn-add-transaction').onclick = addTransaction;
        }

        function loadFinanzasData() {
            // Carga de Cuentas 
            accounts = JSON.parse(localStorage.getItem('chronos_accounts') || '[{"id": "TOTAL", "name": "Total Consolidado"}]');
            // Carga de Transacciones
            transactions = JSON.parse(localStorage.getItem('chronos_transactions') || '[]');
        }

        // --- GESTIÓN DE CUENTAS (NUEVO) ---
        window.showAccountModal = function() {
            const modalEl = document.getElementById('accountModal');
            renderAccountsListInModal();
            new bootstrap.Modal(modalEl).show();
        };

        window.addAccount = function() {
            const nameInput = document.getElementById('new-account-name');
            const name = nameInput.value.trim();
            if (name && accounts.findIndex(a => a.name.toLowerCase() === name.toLowerCase()) === -1) {
                const newAccount = { id: Date.now().toString(), name: name };
                accounts.push(newAccount);
                localStorage.setItem('chronos_accounts', JSON.stringify(accounts));
                nameInput.value = '';
                renderAccountsDropdown();
                renderAccountsListInModal();
                showNotification(`Cuenta '${name}' creada.`, 'success');
            } else {
                showNotification("Nombre de cuenta inválido o ya existe.", 'error');
            }
        };

        window.deleteAccount = function(id) {
            if (id === 'TOTAL') {
                showNotification("No se puede eliminar la cuenta 'Total Consolidado'.", 'error');
                return;
            }
            // Verificar si hay transacciones asociadas a la cuenta
            if (transactions.some(t => t.accountID === id)) {
                showNotification("No se puede eliminar una cuenta con transacciones registradas.", 'error');
                return;
            }
            
            // Usar una modal simple de confirmación
            if (confirm(`¿Estás seguro de que quieres eliminar la cuenta?`)) {
                 accounts = accounts.filter(a => a.id !== id);
                 localStorage.setItem('chronos_accounts', JSON.stringify(accounts));
                 if (currentAccountID === id) currentAccountID = 'TOTAL';
                 renderAccountsDropdown();
                 renderAccountsListInModal();
                 renderFinanzas();
                 showNotification("Cuenta eliminada.", 'info');
            }
        };

        function renderAccountsDropdown() {
            const selectEl = document.getElementById('finance-account-select');
            if (!selectEl) return;

            selectEl.innerHTML = accounts.map(account => `
                <option value="${account.id}" ${account.id === currentAccountID ? 'selected' : ''}>${account.name}</option>
            `).join('');

            // Asegurar que el ID actual sea el seleccionado (o TOTAL si no existe)
            currentAccountID = selectEl.value || 'TOTAL';
            selectEl.onchange = (e) => { 
                currentAccountID = e.target.value; 
                renderFinanzas(); 
            };
            
            // Renderizar el balance total
            renderTotalBalance();
        }

        function renderAccountsListInModal() {
            const listEl = document.getElementById('accounts-list-modal');
            if (!listEl) return;
            
            listEl.innerHTML = accounts.map(account => `
                <div class="flex justify-between items-center p-2 rounded-lg bg-gray-800/50 border border-cyan-400/20">
                    <span class="text-white">${account.name}</span>
                    <button class="text-red-400 text-sm" onclick="deleteAccount('${account.id}')" ${account.id === 'TOTAL' ? 'disabled' : ''}>
                        <span data-lucide="x" class="w-4 h-4"></span>
                    </button>
                </div>
            `).join('');
             lucide.createIcons();
        }
        
        function updateCategoryOptions(type) {
             const categorySelect = document.getElementById('finance-category');
             categorySelect.innerHTML = '';
             
             const categories = TRANSACTION_CATEGORIES[type] || [];
             categories.forEach(cat => {
                 const option = document.createElement('option');
                 option.value = cat;
                 option.textContent = cat.toUpperCase();
                 categorySelect.appendChild(option);
             });
        }
        
        function calculateTotalBalance(transactionsList) {
            return transactionsList.reduce((balance, t) => {
                const amount = parseFloat(t.amount);
                return t.type === 'income' ? balance + amount : balance - amount;
            }, 0);
        }
        
        function renderTotalBalance() {
            const totalBalance = calculateTotalBalance(transactions);
            const totalDisplay = document.getElementById('finance-total-balance');
            totalDisplay.textContent = `$${totalBalance.toFixed(2)}`;
            totalDisplay.classList.remove('text-green-400', 'text-red-400', 'text-white');
            if (totalBalance > 0) totalDisplay.classList.add('text-green-400');
            else if (totalBalance < 0) totalDisplay.classList.add('text-red-400');
            else totalDisplay.classList.add('text-white');
        }


        function addTransaction() {
            if (isHistoryMode) {
                 showNotification("No se puede añadir transacciones en modo historial.", 'error');
                 return;
            }

            const descriptionInput = document.getElementById('finance-description');
            const amountInput = document.getElementById('finance-amount');
            const typeSelect = document.getElementById('finance-type');
            const categorySelect = document.getElementById('finance-category'); 
            const recurringCheckbox = document.getElementById('finance-recurring'); 
            const accountSelect = document.getElementById('finance-account-select'); 

            const description = descriptionInput.value.trim();
            const amount = parseFloat(amountInput.value);
            const type = typeSelect.value;
            const category = categorySelect.value;
            const accountID = accountSelect.value; 
            const recurring = recurringCheckbox.checked; 

            if (!description || isNaN(amount) || amount <= 0) {
                showNotification("Verifica la descripción y el monto (debe ser positivo).", 'error');
                return;
            }

            const newTransaction = {
                id: Date.now(),
                description: description,
                amount: amount,
                type: type,
                category: category,
                accountID: accountID, 
                recurring: recurring, 
                date: new Date().toISOString()
            };

            transactions.push(newTransaction);
            localStorage.setItem('chronos_transactions', JSON.stringify(transactions));

            // Limpiar inputs
            descriptionInput.value = '';
            amountInput.value = '';
            recurringCheckbox.checked = false;

            renderFinanzas();
            showNotification(`Transacción de $${amount.toFixed(2)} (${type.toUpperCase()}) registrada.`, 'success');
        }
        
        window.deleteTransaction = function(id) {
            if (isHistoryMode) return;
            
            const transactionIndex = transactions.findIndex(t => t.id == id);
            if (transactionIndex !== -1) {
                if (confirm(`¿Estás seguro de que quieres eliminar la transacción?`)) {
                    transactions.splice(transactionIndex, 1);
                    localStorage.setItem('chronos_transactions', JSON.stringify(transactions));
                    renderFinanzas();
                    showNotification("Transacción eliminada.", 'info');
                }
            }
        }
        
        function renderFinanzas() {
            const transactionsList = document.getElementById('transactions-list');
            const balanceDisplay = document.getElementById('finance-balance-display');
            const currentAccountDisplay = document.getElementById('current-account-display');
            
            transactionsList.innerHTML = '';

            let currentBalance = 0;

            const transactionsToDisplay = transactions
                .filter(t => t.date.substring(0, 10) <= currentViewingDateKey) // Filtrar por fecha de historial
                .sort((a, b) => b.id - a.id);
            
            // 1. Filtrar por cuenta (si no es 'TOTAL') y calcular balance
            const filteredTransactions = transactionsToDisplay.filter(t => currentAccountID === 'TOTAL' || t.accountID === currentAccountID);
            
            // Calcular balance acumulado para la vista actual
            const reversedTransactions = [...filteredTransactions].reverse();
            let accumulatedBalance = 0;
            
            reversedTransactions.forEach(t => {
                const amount = parseFloat(t.amount);
                const isIncome = t.type === 'income';
                accumulatedBalance += isIncome ? amount : -amount;
                t.balanceAfter = accumulatedBalance; // Guardar temporalmente el balance para esta vista
            });
            
            currentBalance = accumulatedBalance; // El balance final de la vista es el acumulado total
            
            // 2. Renderizar Balance
            balanceDisplay.textContent = `$${currentBalance.toFixed(2)}`;
            balanceDisplay.classList.remove('text-green-400', 'text-red-400', 'text-white');
            if (currentBalance > 0) balanceDisplay.classList.add('text-green-400');
            else if (currentBalance < 0) balanceDisplay.classList.add('text-red-400');
            else balanceDisplay.classList.add('text-white');
            
            const accountName = accounts.find(a => a.id === currentAccountID)?.name || 'TOTAL';
            currentAccountDisplay.textContent = `BALANCE DE CUENTA: ${accountName.toUpperCase()}`;
            
            // 3. Renderizar Lista de Transacciones (filtradas y ordenadas)
            filteredTransactions.forEach(t => {
                const categoryDisplay = t.category || (t.type === 'income' ? 'Ingreso' : 'Gasto'); 
                const isIncome = t.type === 'income';
                const sign = isIncome ? '+' : '-';
                const amountClass = isIncome ? 'text-green-400' : 'text-red-400';
                const formattedAmount = t.amount.toFixed(2);
                const dateDisplay = t.date.substring(0, 10);
                const recurringBadge = t.recurring ? `<span class="text-xs ms-1 text-cyan-400/50" title="Recurrente">(R)</span>` : '';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-left text-xs text-gray-400">${dateDisplay}</td>
                    <td class="text-left">${t.description}</td>
                    <td class="text-left text-xs text-cyan-400">${categoryDisplay}${recurringBadge}</td>
                    <td class="text-right text-sm text-gray-400">${isIncome ? 'ING' : 'GTO'}</td>
                    <td class="text-right ${amountClass}">${sign}${formattedAmount}</td>
                    <td class="text-center">
                        ${!isHistoryMode ? `<button class="text-red-500 hover:text-red-700" onclick="deleteTransaction('${t.id}')">
                            <span data-lucide="x" class="w-4 h-4"></span>
                        </button>` : `<span class="text-gray-600"><span data-lucide="eye-off" class="w-4 h-4"></span></span>`}
                    </td>
                `;
                transactionsList.appendChild(row);
            });
            
            renderTotalBalance();
            lucide.createIcons();
        }

        // --- LÓGICA DEL MÓDULO RECURSOS (ANÁLISIS) ---
        function initializeRecursosModule() {
            // Recopilar todos los datos históricos y actuales
            const allMetrics = getAllMetricsData();
            const allTasks = getAllTasksData();
            const allTransactions = transactions; 
            const allPomodoroLogs = JSON.parse(localStorage.getItem('chronos_pomodoro_log') || '[]');
            
            renderAuxTimeChart(allMetrics);
            renderTaskCompletionChart(allTasks);
            renderExpenseCategoryChart(allTransactions);
            renderPomodoroConsistencyChart(allPomodoroLogs);
            renderBalanceEvolutionChart(allTransactions);
        }
        
        // Utilidades para Recopilación de Datos Históricos
        function getAllMetricsData() {
            const history = JSON.parse(localStorage.getItem('chronos_metrics_history') || '{}');
            const current = JSON.parse(localStorage.getItem('chronos_metrics') || '{}');
            
            const all = {};
            // Agregar historial
            Object.keys(history).forEach(date => {
                Object.keys(history[date]).forEach(aux => {
                    const time = history[date][aux].time || 0;
                    all[aux] = (all[aux] || 0) + time;
                });
            });
            // Agregar actual (si es un AUX rastreable)
            Object.keys(current).forEach(aux => {
                 const time = current[aux].time || 0;
                 all[aux] = (all[aux] || 0) + time;
            });
            return all;
        }

        function getAllTasksData() {
            const history = JSON.parse(localStorage.getItem('chronos_tasks_history') || '{}');
            const current = JSON.parse(localStorage.getItem('chronos_tasks') || '[]');
            
            const all = [];
            
            Object.keys(history).forEach(date => {
                all.push(...history[date]);
            });
            all.push(...current);
            return all;
        }
        
        // ------------------------------------
        // --- GRÁFICOS DE RECURSOS (FASE 7) ---
        // ------------------------------------

        function renderAuxTimeChart(metrics) {
            if (auxTimeChartInstance) auxTimeChartInstance.destroy();
            
            const trackedMetrics = Object.fromEntries(
                Object.entries(metrics).filter(([aux, time]) => ALL_TIME_TRACKED_STATES.includes(aux) && time > 0)
            );

            const labels = Object.keys(trackedMetrics).map(aux => aux.toUpperCase());
            const data = Object.values(trackedMetrics).map(time => Math.round(time / 60)); // Minutos
            const colors = labels.map((_, i) => getNeonColor(i).color);
            const borders = labels.map((_, i) => getNeonColor(i).border);

            const totalTime = data.reduce((sum, min) => sum + min, 0);
            document.getElementById('aux-time-summary').textContent = `Total analizado: ${formatMinutes(totalTime)}.`;
            
            const ctx = document.getElementById('auxTimeChart').getContext('2d');
            auxTimeChartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderColor: borders,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top', labels: { color: '#E5E7EB', font: { family: 'Space Mono' } } },
                        tooltip: { callbacks: { label: (context) => `${context.label}: ${formatMinutes(context.parsed)}` } }
                    }
                }
            });
        }

        function renderTaskCompletionChart(tasks) {
            if (taskCompletionChartInstance) taskCompletionChartInstance.destroy();

            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(t => t.completed).length;
            const pendingTasks = totalTasks - completedTasks;

            const data = [pendingTasks, completedTasks];
            const labels = ['Pendientes', 'Completadas'];
            const colors = [
                'rgba(255, 65, 65, 0.8)', // Rojo
                'rgba(16, 185, 129, 0.8)' // Verde
            ];
            const borders = [
                'rgba(255, 65, 65, 1)',
                'rgba(16, 185, 129, 1)'
            ];

            document.getElementById('task-completion-summary').textContent = `Total de tareas registradas: ${totalTasks}.`;

            const ctx = document.getElementById('taskCompletionChart').getContext('2d');
            taskCompletionChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderColor: borders,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#E5E7EB', font: { family: 'Space Mono' } } },
                        title: { display: false }
                    }
                }
            });
        }
        
        function renderExpenseCategoryChart(transactions) {
            if (expenseCategoryChartInstance) expenseCategoryChartInstance.destroy();
            
            const expenseMap = transactions
                .filter(t => t.type === 'expense' && t.date.substring(0, 10) <= currentViewingDateKey)
                .reduce((map, t) => {
                    const cat = t.category || 'Otros Gastos';
                    map[cat] = (map[cat] || 0) + parseFloat(t.amount);
                    return map;
                }, {});

            const labels = Object.keys(expenseMap);
            const data = Object.values(expenseMap);
            
            const totalExpense = data.reduce((sum, amount) => sum + amount, 0);
            document.getElementById('expense-summary').textContent = `Total de gastos analizados: $${totalExpense.toFixed(2)}.`;

            const colors = labels.map((_, i) => getNeonColor(i).color);
            const borders = labels.map((_, i) => getNeonColor(i).border);

            const ctx = document.getElementById('expenseCategoryChart').getContext('2d');
            expenseCategoryChartInstance = new Chart(ctx, {
                type: 'polarArea',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors.map(c => c.replace('1)', '0.7)')), // Más transparentes
                        borderColor: borders,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                         r: { grid: { color: '#1F2937' }, ticks: { backdropColor: '#0D0D0D', color: '#E5E7EB', font: { family: 'Space Mono' } } }
                    },
                    plugins: {
                        legend: { position: 'right', labels: { color: '#E5E7EB', font: { family: 'Space Mono' } } },
                        tooltip: { callbacks: { label: (context) => `${context.label}: $${context.parsed.toFixed(2)}` } }
                    }
                }
            });
        }

        function renderPomodoroConsistencyChart(pomodoroLogs) {
            if (pomodoroConsistencyChartInstance) pomodoroConsistencyChartInstance.destroy();
            
            const today = new Date(currentViewingDateKey);
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 6);
            
            const dailyCounts = {};
            const labels = [];
            
            // Inicializar los últimos 7 días
            for (let d = new Date(sevenDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
                const dateKey = getTodayDateKey(d);
                dailyCounts[dateKey] = 0;
                labels.push(dateKey.substring(5)); // Muestra solo Mes-Día
            }
            
            // Contar logs
            pomodoroLogs.forEach(log => {
                const dateKey = log.date;
                if (dailyCounts.hasOwnProperty(dateKey)) {
                    dailyCounts[dateKey]++;
                }
            });
            
            const data = Object.values(dailyCounts);

            const ctx = document.getElementById('pomodoroConsistencyChart').getContext('2d');
            pomodoroConsistencyChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Pomodoros Completados',
                        data: data,
                        backgroundColor: 'rgba(255, 65, 65, 0.7)',
                        borderColor: 'rgba(255, 65, 65, 1)',
                        borderWidth: 1,
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: false }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#9CA3AF', font: { family: 'Space Mono' } },
                            grid: { color: '#1F2937' }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#9CA3AF', font: { family: 'Space Mono', size: 10 } },
                            grid: { color: '#1F2937' }
                        }
                    }
                }
            });
        }
        
        function renderBalanceEvolutionChart(transactions) {
            if (balanceEvolutionChartInstance) balanceEvolutionChartInstance.destroy();
            
            // Filtrar transacciones hasta la fecha de vista
            const transactionsFiltered = transactions
                .filter(t => t.date.substring(0, 10) <= currentViewingDateKey)
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            const dailyBalances = {};
            let currentBalance = 0;
            const allDates = new Set();
            
            transactionsFiltered.forEach(t => {
                const dateKey = t.date.substring(0, 10);
                allDates.add(dateKey);
            });
            
            const sortedDates = Array.from(allDates).sort();
            
            sortedDates.forEach(date => {
                const dailyTransactions = transactionsFiltered.filter(t => t.date.substring(0, 10) === date);
                
                dailyTransactions.forEach(t => {
                    const amount = parseFloat(t.amount);
                    currentBalance += (t.type === 'income' ? amount : -amount);
                });
                
                dailyBalances[date] = currentBalance;
            });
            
            const labels = sortedDates;
            const data = sortedDates.map(date => dailyBalances[date]);

            const ctx = document.getElementById('balanceEvolutionChart').getContext('2d');
            balanceEvolutionChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Balance Acumulado ($)',
                        data: data,
                        borderColor: 'rgba(16, 185, 129, 0.9)', // Verde
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top', labels: { color: '#E5E7EB', font: { family: 'Space Mono' } } },
                        tooltip: { callbacks: { label: (context) => `${context.dataset.label}: $${context.parsed.y.toFixed(2)}` } }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#9CA3AF', font: { family: 'Space Mono' } },
                            grid: { color: '#1F2937' }
                        },
                        y: {
                            ticks: { color: '#9CA3AF', font: { family: 'Space Mono' } },
                            grid: { color: '#1F2937' }
                        }
                    }
                }
            });
        }

        // --- FINAL DE LA LÓGICA ---

        // Guardar el estado al salir/recargar
        window.addEventListener('beforeunload', () => {
            if (!isHistoryMode) {
                // Guardado TRABAJO
                if (isTiming && seconds > 0) {
                     updateMetrics(currentAUX, seconds); 
                }
                localStorage.setItem('chronos_is_timing', isTiming ? 'true' : 'false');
                localStorage.setItem('chronos_seconds', 0); // Resetear segundos de sesión, ya loggeados
                
                // Guardado FOCO
                localStorage.setItem('chronos_pomo_running', pomoIsRunning ? 'true' : 'false');
                localStorage.setItem('chronos_pomo_seconds', pomoSeconds);
                localStorage.setItem('chronos_pomo_state', pomoState);
            }
        });

        // Ejecutar la validación de sesión al cargar la ventana
        window.onload = checkSession;
    </script>