/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/https', 'N/url'], (https, url) => {
    const pageInit = (context) => {
  };

  function expandBOMComponents(poId) {
    
    try {
      const suiteletUrl = url.resolveScript({
        scriptId: 'customscript_sty_sl_push_bomcomponents',
        deploymentId: 'customdeploy_sty_sl_push_bomcomponents',
        params: { poId: poId }
      });

      const response = https.get({
        url: suiteletUrl
      });

      window.location.reload();

    } catch (e) {
      console.error('Error:', e);
      window.location.reload();
    }
  }

  window.expandBOMComponents = expandBOMComponents;

  return {
    pageInit: pageInit,
    expandBOMComponents: expandBOMComponents
  };
});
