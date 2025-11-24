/*----------------------------------------------------------------------------------------------
		Company Name 	:	Nuvista Technologies Pvt Ltd
		Script Name 	:	OneFM Credit Memo Integration UserEvent
		Author 			:  	NVT Employee 
		Date            :   30-07-2021 
		Description		:	1. The Script is used for updated Credit Memo(Payment notice API) send from NS to the OneFM system.

------------------------------------------------------------------------------------------------*/

/**
 *@NApiVersion 2.0
 *@NScriptType UserEventScript
 *@NModuleScope Public
 */
//This function is used to send updated Credit Memo(Payment Notice API) record from NS to OneFM

define(['N/config','N/format','N/record','N/url','N/runtime','N/http','N/search','N/xml','./OneFM_Lib.js','N/https'],
  function(config,format,record,url,runtime,http,search,xml,libjs,https) {
		//Begin: AfterSubmit functionality
		 function afterSubmitCustomer_OneFM(context) {
			try {
					if(context.type != context.UserEventType.DELETE)
					{
						EditCreditmemo_OneFM(context,config,format,record,url,runtime,http,search,xml,https);
					}		
			}
			catch(err) {
			log.debug({title: 'err',details: err});	
			if(err.details) {
				return {"statuscode":"406","success":"false", "message":err.details}
			} else if(err.code) {
				return {"statuscode":"407","success":"false", "message":err.code}
			} else if(err.message) {
				return {"statuscode":"408","success":"false", "message":err.message}
			}
		}
	  //End: AfterSubmit functionality
	}
    return {
		afterSubmit: afterSubmitCustomer_OneFM
    };
});

function EditCreditmemo_OneFM(context,config,format,record,url,runtime,http,search,xml,https)
{
		try
		{
					//API for contact Create 
					//var postURL = 'http://dev.mesonefm.com.sg/api/netsuite/payment/notice/edit';
					var postURL = getURL_fun() + "api/netsuite/payment/notice/edit";
					log.debug('postURL',postURL);
					//Header Parameter
					var headerObj = getHeaderObject();	
                  	log.debug({title: 'headerObj',details: JSON.stringify(headerObj)});	


			
					var payment_notice_id = '', Payment_notice_type ='' ,credit_note_amount ='' ,credit_note_doc_url = '' ,one_fm_service_request_id='';
					var currentRec = context.newRecord;
					
					//Begin : Credit Memo Update functionality	
					if(nullCheck(currentRec))
					{
							var loadRecord = record.load({
															type: currentRec.type,
															id: currentRec.id,
															isDynamic: true
														});
					
							//payment_notice_id = currentRec.id;
							
							//Multiple invoice request:start
							var invoice_id_array=[];
							var invoice_info_array=[];
							var ofm_request_array=[];
							var line_count_apply = loadRecord.getLineCount({sublistId:'apply'});
							for (var index = 0; index < line_count_apply; index++) {	
								var is_apply = loadRecord.getSublistValue({sublistId: 'apply',fieldId: 'apply',line: index});
								if(is_apply==true){
									var invoice_id = loadRecord.getSublistValue({sublistId: 'apply',fieldId: 'internalid',line: index});
									if(nullCheck(invoice_id)){
										invoice_id_array.push(invoice_id);
									}
								}
							}
							if(nullCheck(invoice_id_array)){
								var invoiceSearchObj = search.create({
								   type: "invoice",
								   filters:
								   [
									  ["type","anyof","CustInvc"], 
									  "AND", 
									  ["internalid","anyof",invoice_id_array],
									  "AND",
									  ["mainline","is","T"]
								   ],
								   columns:
								   [
									  search.createColumn({name: "internalid", label: "Internal ID"}),
									  search.createColumn({name: "custbody_ofm_invoice_paymentnoticeid", label: "Payment Notice ID"}),
									  search.createColumn({name: "custbody_ofm_invoice_paymentnoticetype", label: "Payment Notice Type"}),
									  search.createColumn({name: "custbody_ofm_invoice_servicerequestid", label: "OFM Invoice Service Request ID"})
								   ]
								});
								var searchResultCount = invoiceSearchObj.runPaged().count;
								//log.debug("invoiceSearchObj result count",searchResultCount);
								invoiceSearchObj.run().each(function(result){

									invoice_info_array.push({'paymentnoticeid':result.getValue('custbody_ofm_invoice_paymentnoticeid'),
															 'paymentnoticetype':result.getValue('custbody_ofm_invoice_paymentnoticetype'),
															 'servicerequestid':result.getValue('custbody_ofm_invoice_servicerequestid'),
															 'internal_id':result.getValue('internalid')
									})
								   // .run().each has a limit of 4,000 results
								   return true;
								});
							}
							if(nullCheck(invoice_info_array)){
								var billedby = runtime.getCurrentUser().name;
								//log.debug('invoice_info_array',JSON.stringify(invoice_info_array));
								for (var apply_index = 0; apply_index < line_count_apply; apply_index++) {	
									var is_apply = loadRecord.getSublistValue({sublistId: 'apply',fieldId: 'apply',line: apply_index});
									if(is_apply==true){
										var apply_invoice_id = loadRecord.getSublistValue({sublistId: 'apply',fieldId: 'internalid',line: apply_index});
										var payment = loadRecord.getSublistValue({sublistId: 'apply',fieldId: 'amount',line: apply_index});
										for(var invoice_info_array_index=0;invoice_info_array_index<invoice_info_array.length;invoice_info_array_index++){
											if(apply_invoice_id==invoice_info_array[invoice_info_array_index].internal_id){
												ofm_request_array.push({'payment_notice_id':invoice_info_array[invoice_info_array_index].paymentnoticeid,
																		'payment_notice_type':invoice_info_array[invoice_info_array_index].paymentnoticetype,
																		'credit_note_amount':payment,
																		'credit_note_doc_url':credit_note_doc_url,
																		'service_request_id':invoice_info_array[invoice_info_array_index].servicerequestid,
																		'credit_note_added_by':billedby
												})
											}
										}
									}
								}
							}
							log.debug('ofm_request_array',JSON.stringify(ofm_request_array));
							//Multiple invoice request:end
							
							
							
							payment_notice_id = loadRecord.getValue({fieldId: 'custbody_ofm_invoice_paymentnoticeid'});
							Payment_notice_type = loadRecord.getValue({fieldId: 'custbody_ofm_invoice_paymentnoticetype'});
							credit_note_amount = loadRecord.getValue({fieldId: 'subtotal'});
                            one_fm_service_request_id = loadRecord.getValue({fieldId: 'custbody_ofm_invoice_servicerequestid'});
                      
							//Begin: Prepare Array to send to OneFM in Post method
							var postarray =ofm_request_array;
							// var postarray = {
												// "payment_notice_id":payment_notice_id,
												// "payment_notice_type":Payment_notice_type ,
												// "credit_note_amount": credit_note_amount,
												// "credit_note_doc_url":credit_note_doc_url,
                                                // "service_request_id":one_fm_service_request_id
											// }
							log.debug('postarray','postarray :'+JSON.stringify(postarray));
							var response = https.post({
														url: postURL,
														body: JSON.stringify(postarray),
														headers: headerObj
													});
							loadRecord.setValue({fieldId: 'custbody_ofm_requestforcreditmemo', value: JSON.stringify(postarray)});						
							if(nullCheck(response))
							{
								log.debug('PostMethod','response Code:'+response.code+'response body:'+response.body);
								var oneFmResponse = "Response Code : " + response.code + " Response Body : " + response.body;
								loadRecord.setValue({fieldId: 'custbody_ofm_creditmemo_memoresponse', value: oneFmResponse});
								
							}  
                      loadRecord.save();
						}
						//End : Credit Memo Update functionality		
		}
		catch(err) {
		log.debug({title: 'Error',details: err});	
		if(err.details) {
			return {"statuscode":"406","success":"false", "message":err.details}
		} else if(err.code) {
			return {"statuscode":"407","success":"false", "message":err.code}
		} else if(err.message) {
			return {"statuscode":"408","success":"false", "message":err.message}
		}
	}	
}
