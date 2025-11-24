/**
 *@NApiVersion 2.0
 *@NScriptType ScheduledScript
 *@NModuleScope Public
 
 
 Description : Invoice cretaed through restlet and for Onefm, Auto number duplication so written this script and in user event auto number should not work , condition added.
 */
 

define(['N/record','N/search'],
  function(record,search) {

    function execute(scriptContext) {
		try {
				var invoice_search = search.load({ id: 'customsearch_ofm_invoicescreatedviaofm' }) //load the created saved search
				var searchResultCount = invoice_search.runPaged().count;
				log.debug("invoicegroupSearchObj result count",searchResultCount);
				//[{"recordType":"invoice","id":"322458","values":{"internalid":[{"value":"322458","text":"322458"}],"tranid":"108375","custbody_ofm_invoice_isonefminvoice":true}}]
				var invoice_results = invoice_search.run().getRange({start: 0,end: searchResultCount});
				log.debug({ title: 'invoice_results: ', details: invoice_results })		
				for(var index=0;	index <	searchResultCount;	index++)
				{
					var recordtype = invoice_results[index].recordType;								
					var recid = invoice_results[index].id;												
					var subsidiary = invoice_results[index].getValue({name: 'subsidiary'});			
					var customform = invoice_results[index].getValue({name: 'customform'});			

					log.debug("Invoice Record Values" , 'recordtype '+ recordtype+
														'| recid '+ recid+
														'| subsidiary '+ subsidiary+
														'| customform '+ customform
										);

					if(nullCheck(subsidiary) && nullCheck(customform) && nullCheck(recid) && nullCheck(recordtype))
					{			
						var resultSearchObj = search.create({
																   type: "customrecord_invoice_auto_template",
																   filters:
																   [
																		["custrecord_inv_subsidiary","anyof",subsidiary],'AND',
																		["custrecord_invoice_form","anyof",customform]
																   ],
																   columns:
																   [
																	  search.createColumn({name: "custrecord_inv_subsidiary"}),
																	  search.createColumn({name: "custrecord_invoice_form"}),
																	  search.createColumn({name: "custrecord_inv_prefix"}),
																	  search.createColumn({name: "custrecord_current_running_no"})
																   ]
															});
						log.debug({title: 'InvoiceAutoTemplateSearch',details :"resultSearchObj"+JSON.stringify(resultSearchObj)});
						if(nullCheck(resultSearchObj))
						{
							var searchResultCount1 = resultSearchObj.runPaged().count;
							var resultSet = resultSearchObj.run();
							var searchResult = resultSet.getRange({	start: 0, end: searchResultCount1 });
							log.debug({title: 'InvoiceAutoTemplateSearch',details :"searchResult"+ JSON.stringify(searchResult)});
							if(nullCheck(searchResult))
							{
								var a = 0;
								var temp_invoice_id	=	searchResult[a].id;
								var invoice_sub	=	searchResult[a].getValue('custrecord_inv_subsidiary');
								var invoice_form	=	searchResult[a].getValue('custrecord_invoice_form');
								var inv_prefix	=	searchResult[a].getValue('custrecord_inv_prefix');
								var running_no	=	searchResult[a].getValue('custrecord_current_running_no');

								var tranid_add	=	inv_prefix + running_no;				log.debug('tranid_add:' ,tranid_add);
								log.debug("recordtype :",recordtype);
									log.debug("recid :",recid);
								var invoice_obj = record.load({
																	type: recordtype,
																	id: recid,
																	isDynamic: true
																});
									invoice_obj.setValue({ fieldId: 'custbody_ofm_invoice_isonefminvoice',value: false});
									invoice_obj.setValue({ fieldId: 'tranid',value: tranid_add});
								var invid = invoice_obj.save({enableSourcing: false,ignoreMandatoryFields: true});				log.debug('invid:', invid);
								
								var increment_no	=	parseFloat(running_no)	+	parseFloat(1);
							
							var loadRecCust = record.load({type:'customrecord_invoice_auto_template', id: temp_invoice_id});
									loadRecCust.setValue({ fieldId: 'custrecord_current_running_no',value: increment_no});
								var idCustRec=loadRecCust.save({enableSourcing: false,ignoreMandatoryFields: true});		
								log.debug('idCustRec:', idCustRec);
							}
						}
					}
				}
			}catch(err)
			{
				log.debug({title: 'err',details: err});	
				if(err.details) {
					return {"statuscode":"406","success":"false", "message":err.details}
				} else if(err.code) {
					return {"statuscode":"407","success":"false", "message":err.code}
				} else if(err.message) {
					return {"statuscode":"408","success":"false", "message":err.message}
				}
			}
    }
    return {
      execute : execute
    };
  }
);



function nullCheck(value)
{
	if (value != null && value != '' && value != undefined)
		return true;
	else
		return false;
}