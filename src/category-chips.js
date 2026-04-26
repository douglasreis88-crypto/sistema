// Script para funcionalidade dos CategoryChips
// Este script adiciona event listenersglobais que funcionam após o React renderizar

(function() {
  'use strict';

  function initCategoryChips() {
    // Aguarda o DOM estar pronto
    if (typeof document === 'undefined') return;

    console.log('Inicializando sistema de categorias...');

    // Função para configurar um label de categoria
    function setupCategoryLabel(label) {
      if (!label || label.dataset.catSetup === 'true') return;
      label.dataset.catSetup = 'true';

      const checkbox = label.querySelector('input[type="checkbox"]');
      if (!checkbox) return;

      // Remove qualquer listener anterior para evitar duplicação
      label.onclick = null;
      checkbox.onchange = null;

      function syncCheckedClass() {
        label.classList.toggle('checked', checkbox.checked);
      }

      // Atualiza o visual sempre que o checkbox mudar
      checkbox.addEventListener('change', function() {
        syncCheckedClass();
        console.log('Categoria alternada:', checkbox.id, checkbox.checked);
      });

      // Permite clique no label sem duplicar o toggle do checkbox
      label.addEventListener('click', function(e) {
        if (e.target === checkbox) return;
        // Deixa o comportamento nativo do label controlar o checkbox
        syncCheckedClass();
      });

      syncCheckedClass();
    }

    // Configura todas as categorias existentes
    const labels = document.querySelectorAll('.cat-chip');
    labels.forEach(function(label) {
      setupCategoryLabel(label);
    });

    // Configura um MutationObserver para observing novos elementos
    if (typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1) { // Element node
              if (node.classList && node.classList.contains('cat-chip')) {
                setupCategoryLabel(node);
              }
              // Verificafilhos
              var childLabels = node.querySelectorAll('.cat-chip');
              childLabels.forEach(function(childLabel) {
                setupCategoryLabel(childLabel);
              });
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    console.log('Sistema de categorias inicializado!');
  }

  // Tenta executar imediatamente
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initCategoryChips, 100);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(initCategoryChips, 100);
    });
  }

  // Tenta novamente após algum tempo (para garantir)
  setTimeout(initCategoryChips, 1000);
  setTimeout(initCategoryChips, 2000);
  setTimeout(initCategoryChips, 3000);

  // Também executa quando há navegação no React Router
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', function() {
      setTimeout(initCategoryChips, 500);
    });
  }

  // Exporta função de inicialização para uso externo
  window.initCategoryChips = initCategoryChips;

})();