/**
*@NApiVersion 2.x
*@NScriptType Restlet
*/

//Begin : RESTlet Script
//This function is used to create Invoice from MES to NS
define(['N/record','N/format','N/config', 'N/search'],
function(record,format,config,search) 
{
	
	function createInvoice(datain) {
		var ReturnResult = {};
		try 
		{
			//datain- From ONeFM, Customer ID,Invoice Date, Memo Global,Location and Item details etc field receive
			log.debug({title: 'datain',details: JSON.stringify(datain)});
			if(nullCheck(datain))
			{
				var PaymentNoticeID = datain.PaymentNoticeID;
				//Begin: new change - If same PAYMENT NOTICE ID , available then ignore and throw error
				var InvIdPaymentNoticeID = checkInvoiceDuplication(PaymentNoticeID);
				log.debug({
					title: 'InvIdPaymentNoticeID',
					details: InvIdPaymentNoticeID
				});
				var isInvwithPaymentId = false;
				if(nullCheck(InvIdPaymentNoticeID))
					isInvwithPaymentId = true;
				//End: new change - If same PAYMENT NOTICE ID , available then ignore and throw error
				if(isInvwithPaymentId == false)
				{
					var itemPriceValue = '-1';
					//var itemTaxCodeValue = '1368';//'71'; CR:06.01.23 TaxRate change from 7% to 8%
                  	var itemTaxCodeValue = '1374';// CR:01.01.24 TaxRate change from 8% to 9%
					
					// getting User Pref timezone.
					var UserInfo = config.load({
						type: config.Type.USER_PREFERENCES
					});
					var UserInfoTimezone = UserInfo.getValue({
						fieldId:'TIMEZONE'
					});
						
					log.debug('UserInfoTimezone', UserInfoTimezone);
					
					
					var CustID = datain.CustID; // getting cust internal id from OneFM
					if(nullCheck(CustID))
					{
						var InvDate = datain.InvDate; // getting Invoice Date from OneFM
						if(nullCheck(InvDate))
						{
							var MemoGlobal = datain.MemoGlobal; // getting Memo Global from OneFM
							
							var LocationData = datain.Location; // getting Location from OneFM
							if(nullCheck(LocationData))
							{
								var Location = getLocation(LocationData);
								log.debug('Location',Location);
								if(nullCheck(Location))
								{
									var location_obj = record.load({type:record.Type.LOCATION,id:Location,isDynamic:false});	
									var subsidiary_id=location_obj.getValue({fieldId : 'subsidiary'});
									log.debug('subsidiary_id',subsidiary_id);
									//var PaymentNoticeID = datain.PaymentNoticeID; // getting PaymentNoticeID from OneFM commented on 6.12.21
									if(nullCheck(PaymentNoticeID))
									{
									
										var PaymentNoticeType = datain.PaymentNoticeType; // getting PaymentNoticeType from OneFM
										log.debug('PaymentNoticeType',PaymentNoticeType);
										if(nullCheck(PaymentNoticeType))
										{
											var ItemID = getItem(PaymentNoticeType)
											log.debug('ItemID',ItemID);
											if(nullCheck(ItemID))
											{
												var ServiceReqID = datain.ServiceRequestID;
												
												var PaymentNoticeNum = datain.PaymentNoticeNumber; 
												var PaymentNoticeDocumntLink = datain.PaymentNoticeDocumentLink; 
												if(nullCheck(ServiceReqID))
												{
													var Description = datain.Description;
													if(nullCheck(Description))
													{
														log.debug("methodPost datain valus ", CustID + " - " + InvDate + " - " + MemoGlobal  + " - " + Location);
														
														//parsing Invoice date in format
														var InvDate2 = format.format({
															value: InvDate,
															type: format.Type.DATE,
															timezone: UserInfoTimezone

														});
														
														log.debug("methodPost InvDate2", InvDate2);
														
														var InvDateFinal = format.parse({
														   value: InvDate2,
														   type: format.Type.DATE
														});
														
														log.debug("methodPost InvDateFinal", InvDateFinal);
														
														
														// creating invoice record and setting value to Header fields and line item.
														var customRecord = record.create({
															type: 'invoice',
															isDynamic: true
														});
													  
													   customRecord.setValue({
															 fieldId: 'customform',
															 value: 112
														 });	
														 
														/*customRecord.setValue({
															 fieldId: 'custbody_dormitory_inv_contractlink',
															 value: 19474
														 });*/
														 
														
														customRecord.setValue({
															fieldId: 'entity',
															value: CustID
														});	
														
													   customRecord.setValue({
																fieldId: 'custbody_ofm_invoice_isonefminvoice',
																value: true
															}); //added on 6.12.21- For fixing existing script auto number duplication issue
															
														customRecord.setValue({
															fieldId: 'subsidiary',
															value: subsidiary_id
														});
													  
													  
														customRecord.setValue({
															fieldId: 'location',
															value: Location
														});	
														
														customRecord.setValue({
															fieldId: 'class',
															value: 1
														});	
														
														customRecord.setValue({
															fieldId: 'custbody_global_memo',
															value: MemoGlobal
														});	
													  
													  customRecord.setValue({
															fieldId: 'custbody_ofm_invoice_paymentnoticeid',
															value: PaymentNoticeID
														});	
														
														customRecord.setValue({
															fieldId: 'custbody_ofm_invoice_paymentnoticetype',
															value: PaymentNoticeType
														});	
														
														customRecord.setValue({
															fieldId: 'trandate',
															value: InvDateFinal
														});	
													  
													  customRecord.setValue({
															fieldId: 'custbody_ofm_invoice_servicerequestid',
															value: ServiceReqID
														});	
														
														 customRecord.setValue({
															fieldId: 'custbody_ofm_inv_paynoticenumfromofm',
															value: PaymentNoticeNum
														});
														
														customRecord.setValue({
															fieldId: 'custbody_ofm_payment_noticedocumentlin',
															value: PaymentNoticeDocumntLink
														});
														
														customRecord.setValue({
															fieldId: 'custbody_global_memo',
															value: Description
														});
														
														customRecord.setValue({
															fieldId: 'custbody_inv_paymethod',
															value: 1 // 1 - Cheque ( added code on 16 Nov 2021)
														});	

														customRecord.selectNewLine({sublistId: "item"});
														customRecord.setCurrentSublistValue({sublistId: "item", fieldId: "item", value: ItemID });
														customRecord.setCurrentSublistValue({sublistId: "item", fieldId: "quantity", value: datain.Quantity});
														customRecord.setCurrentSublistValue({sublistId: "item", fieldId: "rate", value: datain.Amount});
														customRecord.setCurrentSublistValue({sublistId: "item", fieldId: "price", value: itemPriceValue});
														customRecord.setCurrentSublistValue({sublistId: "item", fieldId: "taxcode", value: itemTaxCodeValue});
														customRecord.setCurrentSublistValue({sublistId: "item", fieldId: "amount", value: datain.Amount});
														//customRecord.setCurrentSublistValue({sublistId: "item", fieldId: "description", value: Description + " ID : "+ PaymentNoticeNum});
														customRecord.setCurrentSublistValue({sublistId: "item", fieldId: "description", value: Description });
														customRecord.setCurrentSublistValue({sublistId: "item", fieldId: "location", value: Location});
													
														customRecord.commitLine({sublistId: "item"});

														
														// saving invoie record.
														var recordId = customRecord.save({
															enableSourcing: true,
															ignoreMandatoryFields: true
														});
															
														if(nullCheck(recordId))
														{
															ReturnResult = {
																"statuscode":"200",
																"success" : "true",
																"Messge" : "Invoice "+recordId+" Created Succefully",
															}
														}
														else 
														{
															ReturnResult = {
																"statuscode":"204",
																"success" : "false",
																"Messge" : "Failed to generate invoice record.",
															}
														}
													}
													else 
													{
														ReturnResult ={
															"statuscode":"405",
															"success":"false", 
															"message":'Description is empty.'
														}
													}
												
												}
												else 
												{
													ReturnResult ={
														"statuscode":"405",
														"success":"false", 
														"message":'ServiceRequestID is empty.'
													}
												}
											}
											else 
											{
												ReturnResult ={
													"statuscode":"405",
													"success":"false", 
													"message":'Item not found with given PaymentNoticeType Data.'
												}
											}
										}
										
										else 
										{
											ReturnResult ={
												"statuscode":"405",
												"success":"false", 
												"message":'PaymentNoticeType is empty.'
											}
										}
									}
									else 
									{
										ReturnResult ={
											"statuscode":"405",
											"success":"false", 
											"message":'PaymentNoticeID is empty.'
										}
									}
								}
								else 
								{
									ReturnResult ={
										"statuscode":"405",
										"success":"false", 
										"message":'Location not found with given location data.'
									}
								}
							}
							else 
							{
								ReturnResult ={
									"statuscode":"405",
									"success":"false", 
									"message":'Location is empty.'
								}
							}
						}
						else 
						{
							ReturnResult ={
								"statuscode":"405",
								"success":"false", 
								"message":'Invoice Date is empty.'
							}
						}
					}
					else 
					{
						ReturnResult ={
							"statuscode":"405",
							"success":"false", 
							"message":'Customer Internal Id is empty.'
						}
					}
				}
				else 
				{
					ReturnResult ={
						"statuscode":"405",
						"success":"false", 
						"message":'Invoice '+InvIdPaymentNoticeID+' with same payment notice id '+PaymentNoticeID+' exist.'
					}
				}
			
			}
			else 
			{ 
				ReturnResult ={
					"statuscode":"405",
					"success":"false", 
					"message":'Invoice data is Empty.'
				}
			}
		}
		
		catch (e) 
		{
			log.debug('Error:', e.toString());
			
			
			ReturnResult = {
							"statuscode":"405",
							"success" : "false",
							"Messge" : e.toString(),
						}
		}
		
		return ReturnResult;
	}
	
	function nullCheck(value)
	{

		if (value != null && value != '' && value != undefined)
			return true;
		else
			return false;
	}	
	
	function getLocation(value)
	{
		var LocationID;
		
		var locationSearchObj = search.create({
			type: "location",
			filters:
			[
				["isinactive","is","F",null,''], 
				"AND", 
				["custrecord_ofm_location_facilityrefpayno","is",value]
			],
			columns:
			[
				search.createColumn({name: "internalid", label: "Internal ID"})
			]
		});
		var searchResultCount = locationSearchObj.runPaged().count;
		log.debug("locationSearchObj result count",searchResultCount);
		locationSearchObj.run().each(function(result){
			
			LocationID = result.getValue("internalid")
			
			return true;
		});
		
		return LocationID;
	}
	
	function getItem(value)
	{
		var ItemID;
		
		var itemSearchObj = search.create({
			type: "item",
			filters:
			[
				["isinactive","is","F",null,''], 
				"AND", 
				["custitem_ofm_item_ofmpaymentnoticetype","is",value]
			],
			columns:
			[
				search.createColumn({name: "internalid", label: "Internal ID"})
			]
		});
		var searchResultCount = itemSearchObj.runPaged().count;
		log.debug("itemSearchObj result count",searchResultCount);
		itemSearchObj.run().each(function(result){
			
			ItemID = result.getValue("internalid")
			
			return true;
		});
		
		return ItemID;
	}
		
	function checkInvoiceDuplication(value)
	{
		var InvoiceID;
		
		var itemSearchObj = search.create({
			type: "invoice",
			filters:
			[
				["custbody_ofm_invoice_paymentnoticeid","is",value]
			],
			columns:
			[
				search.createColumn({name: "internalid", label: "Internal ID"})
			]
		});
		var searchResultCount = itemSearchObj.runPaged().count;
		log.debug("itemSearchObj result count",searchResultCount);
		itemSearchObj.run().each(function(result){
			
			InvoiceID = result.getValue("internalid")
			
			return true;
		});
		
		return InvoiceID;
	}
	
	return{
		post:createInvoice
	};
});