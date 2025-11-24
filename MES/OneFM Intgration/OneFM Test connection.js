/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget','N/http'], function(serverWidget,http) {
    function onRequest(context)
	{
		if (context.request.method === 'GET')
		{

			var form = serverWidget.createForm({title: 'OneFm Integration'});
			var leadname = form.addField({id: 'lead_name',type: serverWidget.FieldType.TEXT,label: 'lead_name'});
			var leadvalue = form.addField({id: 'lead_value', type: serverWidget.FieldType.TEXT, label: 'lead_value'}); 
			form.addSubmitButton({label: 'Submit'});
			context.response.writePage(form);
		}
		else //POST
		{
			var lead_name = context.request.parameters.lead_name;
			var lead_value = context.request.parameters.lead_value;
			var PostMethod = 'lead_name :'+lead_name+'| lead_value : '+lead_value;
			log.debug('PostMethod','lead_name :'+lead_name+'| lead_value : '+lead_value);
			var postarray = {"lead_name":lead_name,"lead_value":lead_value};
			var postURL = 'http://dev.mesonefm.com.sg/api/netsuite/lead/record/create';
			var headerObj = {
							"Authorization": "token J34ISV2DD42Ol0qIeJqNaIDWRHCEFLSj",
							"client-id": "e5374141-286a-451c-9938-070767000d06",
							"client-secret": "WFNhArHJZrkir2dt1cFsYgeCJXraHSBq6oNSxetU6XKvPgpk",
							"Content-Type": "application/json"
						  };
			var response = http.request({
											method: http.Method.POST,
											url: postURL,
											body: JSON.stringify(postarray),
											headers: headerObj
										});
			log.debug('PostMethod','response Code:'+response.code+'response body:'+response.body);
			context.response.write("<html><body>"+response.body+"</body></html>");
		}
		
	}
    return {
        onRequest: onRequest
    };
});