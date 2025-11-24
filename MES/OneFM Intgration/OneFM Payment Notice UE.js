/*----------------------------------------------------------------------------------------------
		Company Name 	:	Nuvista Technologies Pvt Ltd
		Script Name 	:	OneFM Contract Integration
		Author 			:  	NVT Employee 
		Date            :   13-08-2021 
		Description		:	1. The Script is created for Migrating Invoice  to OneFM system.
							2. Record should be migrated when status is Approved (Approve button click)
------------------------------------------------------------------------------------------------*/

/**
 *@NApiVersion 2.0
 *@NScriptType UserEventScript
 *@NModuleScope Public
 */
//This function is used to send updated Invoice from NS to OneFM

define(['N/config','N/format','N/record','N/url','N/runtime','N/http','N/search','N/xml','./OneFM_Lib.js','N/https'],
  function(config,format,record,url,runtime,http,search,xml,libjs,https) {
	//Begin: beforeLoad functionality
	function beforeLoad(context) {
		try{
          // Start : Following function added on 26-10-2021, to show OneFm Transfer button if invoice approved and not send to OneFM 
			if(context.type == "view" )
			{
				log.debug('context.type in view',context.type);
				var newRec = context.newRecord;
				
				var payment_notice_id = newRec.getValue({fieldId: 'custbody_ofm_invoice_paymentnoticeid'});
				var payment_notice_number = newRec.getValue({fieldId: 'custbody_ofm_inv_paynoticenumfromofm'});
				var invoice_trasfered = newRec.getValue('custbody_ofm_invoicetransfer');
				var approvalstatus = newRec.getValue('approvalstatus');
				log.debug('payment_notice_id',payment_notice_id);
				log.debug('payment_notice_number',payment_notice_number);
				log.debug('invoice_trasfered',invoice_trasfered);
				log.debug('approvalstatus',approvalstatus);
				
				
				if(nullCheck(payment_notice_id) && nullCheck(payment_notice_number) && invoice_trasfered == false && approvalstatus == 2)
				{
					var form = context.form; 
					form.addButton({ id: 'custpage_approve_button', label: 'OneFm Transfer', functionName: 'approvedInvoice_OneFM'});
                  //context.form.clientScriptModulePath = 'SuiteScripts/OneFM Integration Scripts/OneFM Payment Notice Client.js';
                  context.form.clientScriptModulePath = './OneFM Payment Notice Client.js';
				}
			}
			// End 
         
          
          
		}
		catch(err){
				log.debug({title: 'err',details: err});	
		}
	}
	//End: beforeLoad functionality
  
	  
	  
		//Begin: AfterSubmit functionality
		 function afterSubmitInvoice_OneFM(context) 
		 {
			 log.debug({title: 'context.type',details: context.type});
			try 
			{
				    var currentRec = context.newRecord;
					var approvalstatus = currentRec.getValue('approvalstatus');
					if(approvalstatus==2){
						//If Approve button click the Send to OneFM (This is handled with STD approve and event type on Deployment of script, so no any condition require in coding.)
						approvedInvoice_OneFM(context,config,format,record,url,runtime,http,search,xml,https);
					}
			}
			catch(err) 
			{
				log.debug({title: 'err',details: err});	
				if(err.details) 
				{
					return {"statuscode":"406","success":"false", "message":err.details}
				} 
				else if(err.code) 
				{
					return {"statuscode":"407","success":"false", "message":err.code}
				} 
				else if(err.message) 
				{
					return {"statuscode":"408","success":"false", "message":err.message}
				}
			}
			//End: AfterSubmit functionality
		}
		
		function approvedInvoice_OneFM(context,config,format,record,url,runtime,http,search,xml,https)
		{
			try 
			{
				//Begin: Post URL and Header Object 
				//var postURL = "http://dev.mesonefm.com.sg/api/netsuite/payment/notice/mark/billed";
				//var postURL = "http://dev.mesonefm.com.sg/api/netsuite/payment/notice/mark/billed";
				//var postURL = 'https://www.mesonefm.com.sg/api/netsuite/payment/notice/mark/billed';
			    var postURL = getURL_fun() + "api/netsuite/payment/notice/mark/billed";
				log.debug('postURL',postURL);
				log.debug({title: 'postURL',details: postURL});
				var headerObj = getHeaderObject();	
				log.debug({title: 'headerObj',details: JSON.stringify(headerObj)});
				//End:Post URL and Header Object
				
				
				//Begin: Variable declaration
				var payment_notice_id = '', payment_notice_type ='' ,service_request_id ='' ;
				//End: '',iable declaration
				
				//Begin:Getting field details from Invoice
				var currentRec = context.newRecord;
				if(nullCheck(currentRec))//If record is created then only all validation will work
				{
					var loadRecord = record.load({
						type: currentRec.type,
						id: currentRec.id,
						isDynamic: true
					});
						
					payment_notice_id = loadRecord.getValue({fieldId: 'custbody_ofm_invoice_paymentnoticeid'});
					payment_notice_number = loadRecord.getValue({fieldId: 'custbody_ofm_inv_paynoticenumfromofm'});
					payment_notice_type = loadRecord.getValue({fieldId: 'custbody_ofm_invoice_paymentnoticetype'});
					service_request_id = loadRecord.getValue({fieldId: 'custbody_ofm_invoice_servicerequestid'});
					
					var billedby = runtime.getCurrentUser().name;
					
					if(nullCheck(payment_notice_id) && nullCheck(payment_notice_number))
					{
					
						//Begin: Prepare Array to send to OneFM in Post method
						var postarray = {
							"payment_notice_id":payment_notice_id,
							"payment_notice_type":payment_notice_type ,
							"service_request_id":service_request_id,
							"billed_by":billedby
				
						}
						log.debug('postarray','postarray :'+JSON.stringify(postarray));
						
						
					/*	var response = http.post({
							url: postURL,
							body: JSON.stringify(postarray),
							headers: headerObj
						});*/
                      
                  				var response = https.post({
					url: postURL,
					body: JSON.stringify(postarray),
					headers: headerObj
				});	

						//loadRecord.setValue({fieldId: 'custbody_ofm_onefmrequestfield', value: JSON.stringify(postarray)});
						loadRecord.setValue({fieldId: 'custbody_ofm_reqforinvoicefld', value: JSON.stringify(postarray)});
						
						if(nullCheck(response))
						{
							log.debug('PostMethod','response Code:'+response.code+'response body:'+response.body);
							var oneFmResponse = "Response Code : " + response.code + " Response Body : " + response.body;
							
							//loadRecord.setValue({fieldId: 'custbody_ofm_contractcreate_response', value: oneFmResponse});
							loadRecord.setValue({fieldId: 'custbody_ofm_invoicetransfered_create', value: oneFmResponse});
							if(response.code == 200)
								//loadRecord.setValue({fieldId: 'custbody_ofm_contracttransfered_create', value: true});
								loadRecord.setValue({fieldId: 'custbody_ofm_invoicetransfer', value: true});
						}
						loadRecord.save();
					}
					else 
					{
						log.debug('nullCheck' , 'PAYMENT NOTICE NUMBER FROM OFM or PAYMENT NOTICE ID blank')
					}
				}
			}
			catch(err) 
			{
				log.debug({title: 'err',details: err});	
				if(err.details) 
				{
					return {"statuscode":"406","success":"false", "message":err.details}
				} 
				else if(err.code) 
				{
					return {"statuscode":"407","success":"false", "message":err.code}
				} 
				else if(err.message) 
				{
					return {"statuscode":"408","success":"false", "message":err.message}
					
				}
			}
		}
		
		
		return {
			afterSubmit: afterSubmitInvoice_OneFM,
			beforeLoad: beforeLoad
		};
});