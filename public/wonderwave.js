
/**
 * WonderWave Chat Widget v1.3
 * A lightweight embeddable chat widget for any website
 * 
 * This file serves as a loader that will load the modular version
 */
(function() {
  'use strict';
  
  function loadWonderWaveModules() {
    // Create a proxy handler for the wonderwave function
    function createWonderwaveProxy() {
      // Create a queue if it doesn't exist
      if(!window.wonderwave || !window.wonderwave.q) {
        window.wonderwave = function(...args) {
          window.wonderwave.q = window.wonderwave.q || [];
          window.wonderwave.q.push(args);
          return null; // Return null by default before init
        };
        window.wonderwave.q = [];
      }
      
      // Return a proxy to handle methods more elegantly
      return new Proxy(window.wonderwave, {
        get(target, prop) {
          if (prop === 'q') return target.q;
          return (...args) => target(prop, ...args);
        }
      });
    }
    
    // Set up wonderwave with the proxy pattern
    window.wonderwave = createWonderwaveProxy();
    
    // Load the main module using absolute URL to prevent 404 errors on external sites
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://query-spark-start.lovable.app/wonderwave/index.js';
    script.onerror = function() {
      console.error('[WonderWave] Failed to load main module from:', script.src);
    };
    document.head.appendChild(script);
  }
  
  // Load the modules when the document is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(loadWonderWaveModules, 1);
  } else {
    document.addEventListener('DOMContentLoaded', loadWonderWaveModules);
  }
})();
