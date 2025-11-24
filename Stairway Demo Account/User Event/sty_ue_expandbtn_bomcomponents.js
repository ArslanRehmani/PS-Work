/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget'], (ui) => {
  
  const beforeLoad = (context) => {
    if (context.type !== context.UserEventType.VIEW) return;
    
    const form = context.form;
    const recId = context.newRecord.id;
    
    form.addButton({
      id: 'custpage_expand_btn',
      label: 'Expand',
      functionName: `expandBOMComponents(${recId})`
    });
    
    form.clientScriptModulePath = './sty_cs_push_bomcomponents.js';
  };
  
  return { beforeLoad };
});