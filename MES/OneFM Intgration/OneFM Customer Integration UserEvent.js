/*----------------------------------------------------------------------------------------------
		Company Name 	:	Nuvista Technologies Pvt Ltd
		Script Name 	:	OneFM Customer Integration UserEvent
		Author 			:  	NVT Employee 
		Date            :   29-07-2021 
		Description		:	1. The Script is created for Updating Customer from NS to OneFM system.

------------------------------------------------------------------------------------------------*/

/**
 *@NApiVersion 2.0
 *@NScriptType UserEventScript
 *@NModuleScope Public
 */
//This function is used to send create Contact record from NS to OneFM

define(['N/config','N/format','N/record','N/url','N/runtime','N/http','N/search','N/xml','./OneFM_Lib.js','N/ui/serverWidget','N/https'],
  function(config,format,record,url,runtime,http,search,xml,libjs,serverWidget,https) {
		function beforeLoad(context) {
			//log.debug({title: 'beforeLoad',details: 'beforeLoad'});	
			var field = context.form.addField({id : 'custpage_hide_btn',type : serverWidget.FieldType.INLINEHTML,label : 'Hide Button'});
			// field.defaultValue="<script>document.getElementById('addcontact').style.display = 'none';</script>"
			var src = "";
			src += 'jQuery("#addcontact").hide();'; 
			src += 'jQuery("#updatecontact").hide();';
			src += 'jQuery("#tbl_addcontact").hide();';
			src += 'jQuery("#tbl_updatecontact").hide();';
            src+='setInterval(function(){ jQuery("#contact__tab tbody tr").each(function(){jQuery(this).find("td:last").empty();}); }, 000);'
          
			field.defaultValue = "<script>jQuery(function($){require([], function(){" + src + ";})})</script>"
		}

		//Begin: AfterSubmit functionality
		 function afterSubmitCustomer_OneFM(context) {
			try {
				    if(context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT)
					{
						var newRec = context.newRecord;
						var recType = newRec.type;
						var rec_id = newRec.id;
						//Load Record
						var newFeatureRecord = record.load({type:recType,id:rec_id,isDynamic:true});
						var Sub_id=newFeatureRecord.getValue({fieldId : 'subsidiary'});
						var category=newFeatureRecord.getValue({fieldId : 'category'});
						//Get line count
						 if(context.type == context.UserEventType.CREATE)
						 {
							var line_count = newFeatureRecord.getLineCount({sublistId:'contactroles'});
							 for(var i=0;i<line_count;i++){
								var contact_id = newFeatureRecord.getSublistValue({sublistId:'contactroles',fieldId:'contact',line: i});
								if(nullCheck(contact_id)){
									var contact_record = record.load({type: record.Type.CONTACT,id : contact_id,isDynamic: true}); 
									contact_record.save({enableSourcing: true,ignoreMandatoryFields: true});
								}
							 }
						 }
						 
						 //On Dormitory customer save create/edit - set 1 , 2, 4, 5, 6 subsidiary automatically for customer
						// log.debug('','Type : '+context.type+'| category = '+category);
						 if(category == 5) //5-Dormitory
						 {
									/* Sunsidiary IDS
									1	Mini Environment Service Pte Ltd	 	 
									7	Daulat Assets Management Pte Ltd
									5	Kaki Bukit Developments Pte Ltd
									4	KT Mesdorm Pte Ltd
									6	Labourtel Management Corporation Pte Ltd
									2	MES & JPD Housing Pte Ltd
									8	MES Group Holdings Pte Ltd
									3	MES Logistics Pte Ltd */ 
							 
							var allSubsidiaryMap_array = [1,2,4,5,6];     //1 , 2, 4, 5, 6 subsidiary ids

							//begin:get existing subsidiary of customer
							var existing_subsidiary_count = newFeatureRecord.getLineCount({sublistId:'submachine'});
							 //log.debug('','existing_subsidiary_count : '+existing_subsidiary_count);
							var existing_subsidiary_array = [];
							 for(var sub_i=0; sub_i<existing_subsidiary_count; sub_i++)
							 {
								 var existing_subsidiary_id = newFeatureRecord.getSublistValue({sublistId:'submachine',fieldId:'subsidiary',line: sub_i});
								 existing_subsidiary_id = parseInt(existing_subsidiary_id);
								existing_subsidiary_array.push(existing_subsidiary_id);
							 }
							//end:get existing subsidiary of customer
								  log.debug('','allSubsidiaryMap_array : '+JSON.stringify(allSubsidiaryMap_array));
								  log.debug('','existing_subsidiary_array : '+JSON.stringify(existing_subsidiary_array));
					
							var new_subsidiary_array = allSubsidiaryMap_array.filter( function( el ) {	return existing_subsidiary_array.indexOf( el ) < 0; } );
						  log.debug('','new_subsidiary_array : '+JSON.stringify(new_subsidiary_array));
							if(nullCheck(new_subsidiary_array))
							{
								var subsidiarySearchObj = search.create({
								   type: "subsidiary",
								   filters:
								   [
									  ["isinactive","is","F"],
									  'AND',
									  ["iselimination","is","F"],
									  'AND',
									  ["internalid","anyof",new_subsidiary_array]
								   ],
								   columns:
								   [
									  search.createColumn({name: "internalid", label: "Internal ID"})
								   ]
								});
								var searchResultCount = subsidiarySearchObj.runPaged().count;
								var subsidiary_array=[];
								subsidiarySearchObj.run().each(function(result){
									subsidiary_array.push({'sub_internal':result.getValue('internalid')});
								   // .run().each has a limit of 4,000 results
								   return true;
								}); 
								 
								if(nullCheck(subsidiary_array)) {
									for(var subsidiary_array_index=0;subsidiary_array_index<subsidiary_array.length;subsidiary_array_index++){
										 //log.debug('','Sub_id : '+Sub_id+'| subsidary array = '+subsidiary_array[subsidiary_array_index].sub_internal);
										if(Sub_id!=subsidiary_array[subsidiary_array_index].sub_internal)
										{
											newFeatureRecord.selectNewLine({ sublistId: 'submachine',line: subsidiary_array_index });
											newFeatureRecord.setCurrentSublistValue({
												sublistId: 'submachine',
												fieldId: 'subsidiary',
												value:subsidiary_array[subsidiary_array_index].sub_internal ,
												ignoreFieldChange: true
											});
											newFeatureRecord.commitLine({ sublistId: 'submachine' });
										}
									}
								}
							}//if(nullCheck(new_subsidiary_array))
								newFeatureRecord.save({enableSourcing: true,ignoreMandatoryFields: true}); 
						 }//if(category == 5) //5-Dormitory
					}
					if(context.type == context.UserEventType.EDIT)
					{
						var currentRec = context.newRecord;
						var is_contract_created =get_contract_search(currentRec.id,search);
						if(parseFloat(is_contract_created)>0){
							EditCustomer_OneFM(context,config,format,record,url,runtime,http,search,xml,https);
						}
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
       	beforeLoad: beforeLoad,
		afterSubmit: afterSubmitCustomer_OneFM
    };
});


function EditCustomer_OneFM(context,config,format,record,url,runtime,http,search,xml,https)
{
		try
		{
					//API for contact Create 
					//var postURL = 'http://dev.mesonefm.com.sg/api/netsuite/client/edit';
					var postURL = getURL_fun() + "api/netsuite/client/edit";					
					//Header Parameter
					var headerObj = getHeaderObject();	
                  	log.debug({title: 'headerObj',details: JSON.stringify(headerObj)});	

			
					var ns_company_id = '', company_name ='' ,account_manager ='' ,mailing_address = '',registered_address ='', email = '', fax = '';
					var currentRec = context.newRecord;
					//Begin : Customer Update functionality	
					if(nullCheck(currentRec))//If record is created then only all validation will work
					{
							var loadRecord = record.load({
															type: currentRec.type,
															id: currentRec.id,
															isDynamic: true
														});
					
							ns_company_id = currentRec.id;

							//var name_type = loadRecord.getValue({fieldId: 'isperson'});
							//log.debug('debug',name_type);
							//if(name_type =='F')
							//{
								//company_name = loadRecord.getValue({fieldId: 'companyname'});
							//}
							//else{
							//	var first_name = loadRecord.getValue({fieldId: 'firstname'});
								//var middle_name = loadRecord.getValue({fieldId: 'middlename'});
								//var last_name = loadRecord.getValue({fieldId: 'lastname'});
								//company_name = first_name+ " "+middle_name+" "+last_name;
							//}
                      		//company_name = loadRecord.getValue({fieldId : 'entitytitle'});//commented on 11.11.21
							company_name = loadRecord.getValue({fieldId : 'altname'});           
							//email = loadRecord.getValue({fieldId: 'email'}); 
                    		email = loadRecord.getValue({fieldId: 'custentity_ofm_cus_emailidaccountsinchar'});  //Replaced email with custentity_ofm_cus_emailidaccountsinchar , decied in prodution UAT 22.11.21
							fax = loadRecord.getValue({fieldId: 'fax'});
							account_manager = loadRecord.getText({fieldId: 'salesrep'});
							
							var address_lineCount = loadRecord.getLineCount({sublistId: 'addressbook'});
							for(var line=0; line<address_lineCount;line++)
							{
								var defaultbilling = loadRecord.getSublistValue({sublistId: 'addressbook', fieldId: 'defaultbilling',line: line});
								log.debug('defaultbilling',defaultbilling);
								var defaultshipping = loadRecord.getSublistValue({sublistId: 'addressbook', fieldId: 'defaultshipping',line: line});
								log.debug('defaultshipping',defaultshipping);
								var address = loadRecord.getSublistValue({sublistId: 'addressbook', fieldId: 'addressbookaddress_text',line: line});
								address = address.replace("\r\n", " ");
								log.debug('address',address);
								if(defaultbilling == true)
								{
									mailing_address = address;
									
								}
								if(defaultshipping == true)
								{
									registered_address = address;
								}
								
							}

						//Do EscapeXML for string data and then preapare POst array to send
								 	//ns_company_id = xml.escape({xmlText : ns_company_id});
									company_name = xml.escape({xmlText : company_name});
									email = xml.escape({xmlText : email});
									fax = xml.escape({xmlText : fax});
                      				mailing_address = xml.escape({xmlText : mailing_address});
									registered_address = xml.escape({xmlText : registered_address});
                      				account_manager = xml.escape({xmlText : account_manager});

							//Begin: Prepare Array to send to OneFM in Post method
							var postarray = {
												"netsuite_company_id": ns_company_id,
												"company_name":company_name ,
												"email": email,
												"account_manager":account_manager,
												"mailing_address": mailing_address,
												"registered_address": registered_address ,
												"fax": fax
											}
							log.debug('postarray','postarray :'+JSON.stringify(postarray));
							var response = https.post({
														url: postURL,
														body: JSON.stringify(postarray),
														headers: headerObj
													});
							loadRecord.setValue({fieldId: 'custentity_ofm_onefmrequestfield_entity', value: JSON.stringify(postarray)});	
							if(nullCheck(response))
							{
								log.debug('PostMethod','response Code:'+response.code+'response body:'+response.body);
								var oneFmResponse = "Response Code : " + response.code + " Response Body : " + response.body;
								loadRecord.setValue({fieldId: 'custentity_ofm_customer_ofmcustomerrespo', value: oneFmResponse});
								
							}  
                      		loadRecord.save();
						}
						//End : Customer Update functionality		
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
