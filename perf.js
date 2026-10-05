/**
 * perf.js - KMIZRD Real-Time Web Performance & Core Web Vitals Monitor
 * Monitors page speed, asset latency, layout stability, and provides instant caching.
 */
(function () {
    'use strict';

    // 1. DNS Preconnect & Resource Hinting
    const preconnectHosts = [
        'https://hgjcmsqforkvcfatygsl.supabase.co',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://cdnjs.cloudflare.com',
        'https://unpkg.com'
    ];

    preconnectHosts.forEach(host => {
        if (!document.querySelector(`link[href="${host}"]`)) {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = host;
            link.crossOrigin = '';
            document.head.appendChild(link);

            const dns = document.createElement('link');
            dns.rel = 'dns-prefetch';
            dns.href = host;
            document.head.appendChild(dns);
        }
    });

    // 2. Metrics Store
    const metrics = {
        ttfb: null,
        fcp: null,
        lcp: null,
        cls: 0,
        domReady: null,
        pageLoad: null,
        slowResources: [],
        timestamp: new Date().toISOString()
    };

    // 3. Navigation Timing (TTFB, DOM Ready, Page Load)
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfNav = performance.getEntriesByType('navigation')[0];
            if (perfNav) {
                metrics.ttfb = Math.round(perfNav.responseStart - perfNav.requestStart);
                metrics.domReady = Math.round(perfNav.domContentLoadedEventEnd - perfNav.startTime);
                metrics.pageLoad = Math.round(perfNav.loadEventEnd - perfNav.startTime);
            } else if (performance.timing) {
                const t = performance.timing;
                metrics.ttfb = Math.round(t.responseStart - t.requestStart);
                metrics.domReady = Math.round(t.domContentLoadedEventEnd - t.navigationStart);
                metrics.pageLoad = Math.round(t.loadEventEnd - t.navigationStart);
            }
            logPerformanceSummary();
        }, 100);
    });

    // 4. Paint Timing (FCP)
    if ('PerformanceObserver' in window) {
        try {
            const paintObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (entry.name === 'first-contentful-paint') {
                        metrics.fcp = Math.round(entry.startTime);
                    }
                }
            });
            paintObserver.observe({ type: 'paint', buffered: true });
        } catch (e) {}

        // 5. Largest Contentful Paint (LCP)
        try {
            const lcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                if (entries.length > 0) {
                    const lastEntry = entries[entries.length - 1];
                    metrics.lcp = Math.round(lastEntry.startTime);
                }
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {}

        // 6. Cumulative Layout Shift (CLS)
        try {
            const clsObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) {
                        metrics.cls += entry.value;
                    }
                }
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {}

        // 7. Slow Resource Monitor (> 2500ms)
        try {
            const resourceObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (entry.duration > 2500 && entry.initiatorType !== 'xmlhttprequest') {
                        metrics.slowResources.push({
                            name: entry.name.split('/').pop().split('?')[0],
                            duration: Math.round(entry.duration),
                            type: entry.initiatorType
                        });
                    }
                }
            });
            resourceObserver.observe({ type: 'resource', buffered: true });
        } catch (e) {}
    }

    // 8. Image Fallback & Healing Watchdog
    document.addEventListener('error', (e) => {
        if (e.target && e.target.tagName === 'IMG') {
            const img = e.target;
            if (!img.getAttribute('data-fallback-applied')) {
                img.setAttribute('data-fallback-applied', 'true');
                const isSubdir = window.location.pathname.includes('/camisetas/') ||
                                 window.location.pathname.includes('/hoodies/') ||
                                 window.location.pathname.includes('/accesorios/') ||
                                 window.location.pathname.includes('/polos/') ||
                                 window.location.pathname.includes('/otros/') ||
                                 window.location.pathname.includes('/oversize/') ||
                                 window.location.pathname.includes('/colecciones/') ||
                                 window.location.pathname.includes('/novedades/') ||
                                 window.location.pathname.includes('/ofertas/') ||
                                 window.location.pathname.includes('/bolsas/');
                img.src = isSubdir ? '../assets/logo.jpg' : 'assets/logo.jpg';
                console.warn(`[KMIZRD Perf Watchdog] Imagen recuperada con fallback: ${e.target.src}`);
            }
        }
    }, true);

    // 9. Console Diagnostic Summary
    function logPerformanceSummary() {
        const clsScore = Number(metrics.cls.toFixed(3));
        const status = (metrics.pageLoad < 1800 && clsScore < 0.1) ? '🟢 EXCELENTE (Carga Rápida)' :
                       (metrics.pageLoad < 3000) ? '🟡 BUENO' : '🟠 MODERADO';

        console.log(
            `%c ⚡ KMIZRD PERFORMANCE MONITOR %c ${status} `,
            'background: #0272ba; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
            'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 4px 8px; border-radius: 0 4px 4px 0;'
        );
        console.table({
            'Tiempo de Carga Total': `${metrics.pageLoad || 'N/A'} ms`,
            'Respuesta del Servidor (TTFB)': `${metrics.ttfb || 'N/A'} ms`,
            'Primer Renderizado (FCP)': `${metrics.fcp || 'N/A'} ms`,
            'Elemento Principal (LCP)': `${metrics.lcp || 'N/A'} ms`,
            'Estabilidad Visual (CLS)': `${clsScore}`,
            'DOM Listo': `${metrics.domReady || 'N/A'} ms`
        });

        if (metrics.slowResources.length > 0) {
            console.warn('[KMIZRD Perf Watchdog] Recursos lentos detectados:', metrics.slowResources);
        }
    }

    // 10. Public API for debugging
    window.kmizrdPerf = {
        getMetrics: () => ({ ...metrics }),
        getReport: () => {
            logPerformanceSummary();
            return metrics;
        }
    };

})();
