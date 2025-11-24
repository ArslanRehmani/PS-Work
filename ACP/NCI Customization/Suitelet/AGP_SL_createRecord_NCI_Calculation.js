/**
 *@NApiVersion 2.0
 *@NScriptType Suitelet
 */
 define(['N/ui/serverWidget', 'N/task', 'N/log'], function (ui, task, log) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
          
            var form = ui.createForm({ title: 'NCI Calculation' });

            form.addSubmitButton({
                label: 'Create NCI Calculation'
            });

            context.response.writePage(form);

        } else {
            try {
                var schTask = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: 'customscript_agp_sc_cr_ncicalculation',   
                    deploymentId: 'customdeploy_agp_sc_cr_ncicalculation'
                });

                var taskId = schTask.submit();
                log.debug('Scheduled Script Task Id', taskId);

                var form = ui.createForm({ title: 'NCI Calculation Processor' });
                form.addField({
                    id: 'custpage_status',
                    type: ui.FieldType.INLINEHTML,
                    label: 'Status'
                }).defaultValue = '<div style="color:green; font-weight:bold;">NCI Calculation Processed</div>';

                context.response.writePage(form);

            } catch (e) {
                log.error('Error', e.message);
                context.response.write('Error occurred: ' + e.message);
            }
        }
    }

    return {
        onRequest: onRequest
    };
});
