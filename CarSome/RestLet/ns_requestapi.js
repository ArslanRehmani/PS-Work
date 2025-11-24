/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record','../Lib/psLib.js','N/format'],
    /**
     * @param {search} search
     * @param {record} record
     */
    function (search, record, lib, format) {
		
		function lookUpAccount(accNumber) {
    		// body...
    		var id = null;
    		var accountSearchObj = search.create({
			   type: "account",
			   filters:
			   [
			      ["number","is",accNumber]
			   ],
			   columns:
			   [
			      search.createColumn({name: "internalid", label: "Internal ID"})
			   ]
			});
			var searchResultCount = accountSearchObj.runPaged().count;
			log.debug("accountSearchObj result count",searchResultCount);
			accountSearchObj.run().each(function(result){
			   // .run().each has a limit of 4,000 results
			   id = result.getValue({name:"internalid"});
			   return true;
			});

			return id;
    	}


    	function createInvoice(objRequest)
    	{	//create invoice

    		var objMsg = null;
    		var recInv = record.create({type:record.Type.INVOICE,isDynamic:true});

    		var CustId = lib.getCustomerIDFromContractNumber(objRequest.registration_number);

    		var trDate = format.parse({value:objRequest.trandate, type: format.Type.DATE});
    		recInv.setValue({fieldId:"customform",value:158});
    		recInv.setValue({fieldId:"entity",value:CustId});
    		recInv.setValue({fieldId:"trandate",value:trDate});

    		recInv.setValue({fieldId:"approvalstatus",value:2});//approved
    		recInv.setValue({fieldId:"memo",value:objRequest.agreement_number +" - "+objRequest.registration_number});
    		//hardcoded
    		recInv.setValue({fieldId:"subsidiary",value:5});
    		recInv.setValue({fieldId:"class",value:2});
    		recInv.setValue({fieldId:"department",value:33});
    		recInv.setValue({fieldId:"location",value:1});
    		recInv.setValue({fieldId:"cseg_carsome_carsrc",value:6});
    		recInv.setValue({fieldId:"cseg_csm_profit_cen",value:17});

    		recInv.setValue({fieldId:"account",value:566});
    		recInv.setValue({fieldId:"exchangerate",value:1});
    		recInv.setValue({fieldId:"currency",value:1});

    		var items = objRequest.items;
    		var countItems = items.length;

    		if(countItems == 2)
    		{
    			recInv.selectNewLine({sublistId: "item"});	
    			recInv.setCurrentSublistValue({sublistId:"item",fieldId:"item",value:1103});
    			recInv.setCurrentSublistValue({sublistId:"item",fieldId:"quantity",value:1});
    			recInv.setCurrentSublistValue({sublistId:"item",fieldId:"description",value:items[0].agreement_number+"-"+items[0].registration_number});
    			recInv.setCurrentSublistValue({sublistId:"item",fieldId:"amount",value:items[0].amount});

    			//harcode
    			recInv.setCurrentSublistValue({sublistId:"item",fieldId:"class",value:2});
    			recInv.setCurrentSublistValue({sublistId:"item",fieldId:"department",value:33});
    			recInv.setCurrentSublistValue({sublistId:"item",fieldId:"location",value:1});
				recInv.setCurrentSublistValue({sublistId:"item",fieldId:"cseg_csm_profit_cen",value:17});
				recInv.setCurrentSublistValue({sublistId:"item",fieldId:"cseg_carsome_carsrc",value:6});
    			recInv.commitLine({sublistId:"item"});

    			recInv.selectNewLine({sublistId: "item"});
    			recInv.setCurrentSublistValue({sublistId:"item",fieldId:"item",value:944});
    			recInv.setCurrentSublistValue({sublistId:"item",fieldId:"quantity",value:1});
    			recInv.setCurrentSublistValue({sublistId:"item",fieldId:"description",value:items[1].agreement_number+"-"+items[1].registration_number});
    			recInv.setCurrentSublistValue({sublistId:"item",fieldId:"amount",value:items[1].amount});

    			//harcode
    			recInv.setCurrentSublistValue({sublistId:"item",fieldId:"class",value:2});
    			recInv.setCurrentSublistValue({sublistId:"item",fieldId:"department",value:33});
    			recInv.setCurrentSublistValue({sublistId:"item",fieldId:"location",value:1});
				recInv.setCurrentSublistValue({sublistId:"item",fieldId:"cseg_csm_profit_cen",value:17});
				recInv.setCurrentSublistValue({sublistId:"item",fieldId:"cseg_carsome_carsrc",value:6});
    			recInv.commitLine({sublistId:"item"});
    		}

    		try{
    			var newInvId = recInv.save();
    			
    			objMsg = {
	    			error : false,
	    			msg : "Invoice has been created successfully. ID: " + newInvId,
	    			id : 0
	    		};
    		}
    		catch(ex)
    		{
    			objMsg = {
	    			error : true,
	    			msg : "Error occured in CarSome POST request." + ex.toString(),
	    			id : 0
	    		};
    		}

    		return objMsg;
    		
    	}

    	function createVendorBill(objRequest)
    	{	//create vendor bill

    		var objMsg = null;
    		var recVBill = record.create({type:record.Type.VENDOR_BILL,isDynamic:true});

    		var account_id = lookUpAccount(objRequest.account_number);
    		var trDate = format.parse({value:objRequest.trandate, type: format.Type.DATE});

    		recVBill.setValue({fieldId:"customform",value:104});
    		recVBill.setValue({fieldId:"tranid",value:objRequest.agreement_number+"-"+objRequest.registration_number});

    		recVBill.setValue({fieldId:"trandate",value:trDate});
    		recVBill.setValue({fieldId:"entity",value:9736});
    		
    		recVBill.setValue({fieldId:"memo",value:objRequest.agreement_number+" - "+objRequest.registration_number});
    		//hardcoded
    		recVBill.setValue({fieldId:"subsidiary",value:5});
    		recVBill.setValue({fieldId:"account",value:account_id});
    		recVBill.setValue({fieldId:"class",value:2});
    		recVBill.setValue({fieldId:"department",value:33});
    		recVBill.setValue({fieldId:"location",value:1});
    		recVBill.setValue({fieldId:"cseg_carsome_carsrc",value:6});
    		recVBill.setValue({fieldId:"cseg_csm_profit_cen",value:17});

    		
    		recVBill.setValue({fieldId:"exchangerate",value:1});
    		recVBill.setValue({fieldId:"currency",value:1});

    		var items = objRequest.items;
    		var countItems = items.length;

    		if(countItems > 0)
    		{
    			recVBill.selectNewLine({sublistId: "expense"});	
    			recVBill.setCurrentSublistValue({sublistId:"expense",fieldId:"account",value:2872});
    			recVBill.setCurrentSublistValue({sublistId:"expense",fieldId:"memo",value:items[0].agreement_number+"-"+items[0].registration_number});
    			recVBill.setCurrentSublistValue({sublistId:"expense",fieldId:"amount",value:items[0].amount});

    			//harcode
    			recVBill.setCurrentSublistValue({sublistId:"expense",fieldId:"taxcode",value:5});
    			recVBill.setCurrentSublistValue({sublistId:"expense",fieldId:"class",value:2});
    			recVBill.setCurrentSublistValue({sublistId:"expense",fieldId:"department",value:33});
    			recVBill.setCurrentSublistValue({sublistId:"expense",fieldId:"location",value:1});
				recVBill.setCurrentSublistValue({sublistId:"expense",fieldId:"cseg_csm_profit_cen",value:17});
				recVBill.setCurrentSublistValue({sublistId:"expense",fieldId:"cseg_carsome_carsrc",value:6});
				
    			recVBill.commitLine({sublistId:"expense"});
    		}

    		try{
    			var vendBillId = recVBill.save();
    			
    			objMsg = {
	    			error : false,
	    			msg : "Vendor Bill has been created successfully. ID: " + vendBillId,
	    			id : 0
	    		};
    		}
    		catch(ex)
    		{
    			objMsg = {
	    			error : true,
	    			msg : "Error occured in CarSome POST request." + ex.toString(),
	    			id : 0
	    		};
    		}

    		return objMsg;
    		
    	}

		function createNewCustomer(objRequest,APOflag)
		{
			//add customer 
			var CR = record.create({type:'customer',isDynamic: true});
			
			if(objRequest.data.is_person == 'true')
			{
				log.debug('user');
				CR.setValue({fieldId: "isperson",value: 'T'});
				
				var names = lib.splitNameIntoFnameLname(objRequest.data.customer_name);
				//log.debug('names',names);
				
				var firstName = names[0];
				var lastName = names[1];
				
				CR.setValue({fieldId: "firstname",value: firstName});
			
				//var lastName = objRequest.data.customer_lname;
				if(APOflag == 'APO')
				{
					lastName = lastName + ' - APO';
				}
				
				CR.setValue({fieldId: "lastname",value: lastName});
			}
			else
			{
				log.debug('company');
				CR.setValue({fieldId: "isperson",value: 'F'});
				
				var companyName = objRequest.data.company_name;
				if(APOflag == 'APO')
				{
					companyName = companyName + ' - APO';
				}
				
				CR.setValue({fieldId: "companyname",value: companyName});
			}			
			
			CR.setValue({fieldId: "email",value: objRequest.data.email_address});								
			CR.setValue({fieldId: "phone",value: objRequest.data.mobile});							
			CR.setValue({fieldId: "subsidiary",value: objRequest.data.subsidiary});								
			CR.setValue({fieldId: "custentity_carsome_cmsid",value: objRequest.data.cms_id});
			CR.setValue({fieldId: "custentity_carsome_comregno",value: objRequest.data.registration_number});			
			
			CR.setValue({fieldId: "custentity_ps_created_from_ucd", value:true});			
			
			//A/R account
			if(APOflag == 'APO')
			{
				CR.setValue({fieldId: "receivablesaccount", value:"566"});
			}
			else if(APOflag == 'HP')
			{
				CR.setValue({fieldId: "receivablesaccount", value:"951"});
			}
			else //regular
			{
				CR.setValue({fieldId: "receivablesaccount", value:"564"});
			}
			

			//add addressbook
			CR.selectNewLine({"sublistId": "addressbook"});
			
			var addressSubrecord = CR.getCurrentSublistSubrecord({
				sublistId: 'addressbook',
				fieldId: 'addressbookaddress'
			});
			
			//addressSubrecord.setValue({"fieldId": "attention", "value": 'Mr'});
			//addressSubrecord.setValue({"fieldId": "addressee", "value": objRequest.data.customer_name});
			var addressArray = lib.splitAddressIn2Lines(objRequest.data.address_line);
			var address_line1 = addressArray[0];
			var address_line2 = addressArray[1];
			
			addressSubrecord.setValue({"fieldId": "addr1", "value": address_line1});
			addressSubrecord.setValue({"fieldId": "addr2", "value": address_line2});
			addressSubrecord.setValue({"fieldId": "city", "value": objRequest.data.city});
			addressSubrecord.setValue({"fieldId": "state", "value": objRequest.data.state});
			addressSubrecord.setValue({"fieldId": "zip", "value": objRequest.data.zip});
			addressSubrecord.setValue({"fieldId": "country", "value": objRequest.data.country});
			
			
			CR.commitLine({
			  sublistId: 'addressbook'
			});								

			CRId = CR.save();
			return CRId;
		}
		
		function main(objRequest,method)
		{
			var objReturn = null;
			log.debug('objRequest',objRequest);
			
			if(method=='POST')
			{
				try
				{
				
					if(objRequest.type == 'journalentry')
					{
						var toSubsidiary = false;
						var JE = record.create({type:'journalentry',isDynamic: true});
						var jsSubsidiary = objRequest.data.subsidiary;
						JE.setValue({fieldId: "subsidiary",value:jsSubsidiary});
						JE.setValue({fieldId: "currency",value: 1});
						JE.setValue({fieldId: "exchangerate",value: 1});
						JE.setValue({fieldId: "custbody_ps_official_receipt_number",value: objRequest.data.official_receipt_no});
						
						var dateMDY = format.parse({value:objRequest.data.date, type: format.Type.DATE});
						JE.setValue({fieldId: "trandate",value: dateMDY});
						JE.setValue({fieldId: "approvalstatus",value: "1"});
						
						var erpnew = false;

						var transTypeList = [];
						transTypeList = lib.getTransTypeList();
						//transTypeList = [{'id':'1','name':'HP-NEW'},{'id':'2','name':'HP-COLL'}];
						
						for (var i = 0; i < objRequest.data.item.length; i++) 
						{
								var customerId = 0;
								
								JE.insertLine({
										sublistId: "line",
										line: 0
									});		
								
                                var acc_id=0;
                                log.debug('objRequest.data.type',objRequest.data.type);

                                if(objRequest.data.type == 'APO-NEWAGRT' || objRequest.data.type == 'APO-MTHINTEREST' || objRequest.data.type == 'APO-SETTLE')    
                                {
                                    var acc_number = objRequest.data.item[i].account_number;
                                    log.debug('acc_number',acc_number);
								    acc_id = lookUpAccount(acc_number);
                                    log.debug('acc_id 1',acc_id);
                                }
								else
                                {
                                    acc_id = objRequest.data.item[i].account_number;
                                    log.debug('acc_id 2',acc_id);
                                }

								JE.setCurrentSublistValue({
									sublistId: "line",
									fieldId: "account",
									value: acc_id
								});

								var debitValue = objRequest.data.item[i].debit;
								var creditValue = objRequest.data.item[i].credit;
								var customer_code = objRequest.data.item[i].customer_code;
								var jvcontract_number = objRequest.data.item[i].contract_number;

								if(customer_code)
								{
									erpnew = true;
									if(debitValue)
									{
										JE.setCurrentSublistValue({
											sublistId: "line",
											fieldId: "debit",
											value: debitValue
										});
									}

									//check C2306 contract number
									customerId = 17841;//getCustomerIDC2306(jvcontract_number,customer_code);
									JE.setCurrentSublistValue({
										sublistId: "line",
										fieldId: "entity",
										value: customerId
									});

									JE.setCurrentSublistValue({
										sublistId: "line",
										fieldId: "eliminate",
										value: true
									});

									toSubsidiary = true;
								}
								else
								{
									if( debitValue >= 0)
									{
										JE.setCurrentSublistValue({
											sublistId: "line",
											fieldId: "debit",
											value: debitValue
										});
									}
									if( creditValue >= 0)
									{
										JE.setCurrentSublistValue({
											sublistId: "line",
											fieldId: "credit",
											value: creditValue
										});
									}

									if(jvcontract_number)
									{								
										if(creditValue >= 0 && creditValue != '0.00'  && objRequest.data.item[i].transaction_type != 'APO-SETTLE' && objRequest.data.type != 'APO-SETTLE')
										{
											log.debug('1');
											customerId = lib.getCreditCustomerIDFromContractNumber(objRequest.data.item[i].contract_number);
										}
										else
										{
											log.debug('2');
											customerId = lib.getCustomerIDFromContractNumber(objRequest.data.item[i].contract_number);
										}
										
										if(customerId > 0)
										{
											JE.setCurrentSublistValue({
												sublistId: "line",
												fieldId: "entity",
												value: customerId
											});
										}
										else
										{
											objReturn = {
												error : true,
												msg : "Invalid Contract Number '" + objRequest.data.item[i].contract_number + "'. Cannot find customer with this contract number.",
												id : 1
											};	
											return objReturn;
										}

										// if(i > 0)
										// {
										// 	var jvcontract_number_before = objRequest.data.item[i].contract_number;
										// 	if(jvcontract_number_before === jvcontract_number)
										// 	{
										// 		JE.setCurrentSublistValue({
										// 			sublistId: "line",
										// 			fieldId: "eliminate",
										// 			value: true
										// 		});
			
										// 		toSubsidiary = true;
										// 	}
										// }
									}
								}

								JE.setCurrentSublistValue({
									sublistId: "line",
									fieldId: "custcol_carsome_plateno",
									value: objRequest.data.item[i].carplate_number
								});
								
								log.debug('objRequest.data.transaction_type',objRequest.data.item[i].transaction_type);
								var transationTypeId = lib.getTransTypeId(objRequest.data.item[i].transaction_type, transTypeList);
								log.debug('transationTypeId',transationTypeId);
								JE.setCurrentSublistValue({
									sublistId: "line",
									fieldId: "custcol_carsome_transaction_type",
									value: transationTypeId
								});
								
								JE.setCurrentSublistValue({
									sublistId: "line",
									fieldId: "custcol_carsome_contractno",
									value: objRequest.data.item[i].contract_number
								});
								
								//get customer name from ID
								var customerName = '';
								if(customerId > 0)
								{
									var srchCustomer = search.lookupFields({
												type: 'customer',
												id: customerId,
												columns: ['firstname','lastname','companyname','isperson']
											});
									//log.debug('customer name',srchCustomer.firstname + ' ' + srchCustomer.lastname);
									if(srchCustomer.isperson)
									{
										customerName = srchCustomer.firstname + ' ' + srchCustomer.lastname;
									}
									else
									{
										customerName = srchCustomer.companyname;
									}
									
								}
								
								if(erpnew)
								{

									JE.setCurrentSublistValue({
										sublistId: "line",
										fieldId: "memo",
										value: customerName+" - "+objRequest.data.item[i].contract_number+" - "+objRequest.data.item[i].carplate_number
									});
								}
								else{
									JE.setCurrentSublistValue({
										sublistId: "line",
										fieldId: "memo",
										value: lib.getUCDMemo(objRequest.data.type,customerName,objRequest.data.posting_period)
									});
								}
								
								
								
								//hardcoded values
								JE.setCurrentSublistValue({
									sublistId: "line",
									fieldId: "custcol_carsome_inspection_id",
									value: 'N/A'
								}); 
								
								var JEDepartment = '33';
								if(objRequest.data.subsidiary == '1')
								{
									JEDepartment = '18';
								}

								if(erpnew)
								{
									JEDepartment = '37';
								}

								JE.setCurrentSublistValue({
									sublistId: "line",
									fieldId: "department",
									value: JEDepartment
								});
								
								if(erpnew)
								{
									JE.setCurrentSublistValue({
										sublistId: "line",
										fieldId: "class",
										value: '1'
									});
								}
								else{
									JE.setCurrentSublistValue({
										sublistId: "line",
										fieldId: "class",
										value: '2'
									});
								}
								
								var JELocation = '1';
								if(objRequest.data.subsidiary == '1')
								{
									JELocation = '19';
								}
								
								JE.setCurrentSublistValue({
									sublistId: "line",
									fieldId: "location",
									value: JELocation
								});
								
								var profitCenter = '17';
								if(objRequest.data.subsidiary == '1')
								{
									profitCenter = '16';
								}
								
								JE.setCurrentSublistValue({
									sublistId: "line",
									fieldId: "cseg_csm_profit_cen",
									value: profitCenter
								});
								
								JE.setCurrentSublistValue({
									sublistId: "line",
									fieldId: "cseg_carsome_carsrc",
									value: '6'
								});
								
								JE.commitLine({sublistId:"line"});
						}
						
						var JEType = '5';
						
						if(toSubsidiary)
						{
							JE.setValue({fieldId: "tosubsidiary",value: "5"});
						}
						
						if(objRequest.data.subsidiary == '1')
						{
							JEType = '1';
						}
						JE.setValue({fieldId: "custbody_carsome_je_type",value: JEType});
						
						//reversal
						if(objRequest.data.type == 'APO-MTHINTEREST')
						{
							
							log.debug('dateDMY',dateDMY);
							var today = new Date(dateDMY);
							var todays_date = dateDMY.getDate();
							var todays_month = dateDMY.getMonth() + 2; //adding one because getMonth returns the previous numeric month
							var todays_year = today.getFullYear();
							
							if(todays_month==0)
							{
								todays_month=1;
							}
							log.debug('todays_month',todays_month);
							var first = new Date(todays_year, todays_month, 1);  //the first day of the month
							log.debug('first',first);
							var first_date = first.getDate();
							var firstMonth = first.getMonth();
							log.debug('firstMonth',firstMonth);
							if(firstMonth == 0)
							{
								firstMonth = 12;
							}
							log.debug('firstMonth',firstMonth);
							log.debug('first_date',first.getDate() + '/' + firstMonth + '/' + first.getFullYear());

							JE.setValue({fieldId: "reversaldefer",value: true});
							JE.setValue({fieldId: "reversaldate",value: new Date( firstMonth + '/' + first.getDate() + '/' + first.getFullYear())});		

							
							// convert to new format MMM YYYY
							/*var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] ;
							var newDate = months[date.getMonth()] + ' ' + date.getFullYear() ;*/							
						}

						try{
			    			var JEId = JE.save();
							log.debug('success','JE created successfully ' + JEId);
			    			
			    			objReturn = {
								error : false,
								msg : "Journal Voucher has been created successfully. ID: " + JEId,
								id : JEId
							};
			    		}
			    		catch(ex)
			    		{
			    			objReturn = {
				    			error : true,
				    			msg : "Error occured in CarSome POST request For Journal Entry." + ex.toString(),
				    			id : 0
				    		};
			    		}

					}
					else if(objRequest.type == 'customer')
					{
						
						if(objRequest.data.subsidiary >= 0 && objRequest.data.registration_number  != '' && objRequest.data.contract_number != '' )
						{
							if((objRequest.data.is_person == 'true' && objRequest.data.customer_name != '') || (objRequest.data.is_person == 'false' && objRequest.data.company_name != ''))
							{
									
									//check if duplicated contract number
									var duplicateContractNumber = lib.getCustomerIDFromContractNumber(objRequest.data.contract_number);
									log.debug('duplicateContractNumber',duplicateContractNumber);
									
									if(duplicateContractNumber <= 0)
									{
									
									
										var CRId = 0;
										var APOId = "";
										var APOCRId = "";
										
										
											if(objRequest.data.cms_id && objRequest.data.cms_id != '')
											{
												//check if cms id exists
												var customerCMSDuplicateId = lib.ifCustomerDuplicateCMSIdManual(objRequest.data.cms_id);
												
												log.debug('customerCMSDuplicateId',customerCMSDuplicateId);
												if(customerCMSDuplicateId > 0)
												{
													//check if APO customer is created for this cms id
													var customerCMSDuplicateIdAPO = lib.ifCustomerDuplicateCMSIdAPOManual(objRequest.data.cms_id);
													
													if(customerCMSDuplicateIdAPO > 0)
													{
														//add only contract number
														CRId = customerCMSDuplicateIdAPO;
														flagCustomerExist = true;
													}
													else
													{
														//manual customer is created with cms id. Add only apo customer.
														CRId = createNewCustomer(objRequest,'APO');
														
														log.debug('CRId2',CRId);
													}
												}
												else
												{
													var customerDuplicateId = lib.ifCustomerDuplicateCMSId(objRequest.data.cms_id);
													if(customerDuplicateId > 0)
													{
														//add only contract number
														CRId = customerDuplicateId;
														flagCustomerExist = true;
													}
													else
													{
														var type = 'HP';
														if(objRequest.data.cms_id)
														{
															type = 'Regular';
														}
														
														CRId = createNewCustomer(objRequest,type);
														log.debug('objRequest.data.cms_id',objRequest.data.cms_id);
																							
														if(objRequest.data.cms_id)
														{
															APOCRId = createNewCustomer(objRequest,'APO');
															APOId = ". APO Customer ID:" + APOCRId;
															log.debug('CRId2',APOId);
														}
														
														log.debug('CRIdfinal',CRId);
														
													}
												}
												
											}
											else
											{
												//check if customer already exists
												var customerDuplicateId = lib.ifCustomerDuplicateId(objRequest.data.registration_number);
												var flagCustomerExist = false;
												
												if(customerDuplicateId > 0)
												{
													//add only contract number
													CRId = customerDuplicateId;
													flagCustomerExist = true;
												}
												else
												{
													var type = 'HP';
													if(objRequest.data.cms_id)
													{
														type = 'Regular';
													}
														
													CRId = createNewCustomer(objRequest,type);
													log.debug('objRequest.data.cms_id',objRequest.data.cms_id);
																						
													if(objRequest.data.cms_id)
													{
														APOCRId = createNewCustomer(objRequest,'APO');
														APOId = ". APO Customer ID:" + APOCRId;
														log.debug('CRId2',APOId);
													}
													
													log.debug('CRIdfinal',CRId);
													
												}
											}
											
											if(APOCRId > 0)
											{
												//add contract number in custom record
												var CN = record.create({type:'customrecord_ps_customer_contract_num',isDynamic: false});
												CN.setValue({fieldId: "custrecord_ps_customer",value: APOCRId});
												CN.setValue({fieldId: "custrecord_ps_contract_num",value: objRequest.data.contract_number});
												
												var CNId = CN.save();
											}
											else if(CRId > 0)
											{
												//add contract number in custom record
												var CN = record.create({type:'customrecord_ps_customer_contract_num',isDynamic: false});
												CN.setValue({fieldId: "custrecord_ps_customer",value: CRId});
												CN.setValue({fieldId: "custrecord_ps_contract_num",value: objRequest.data.contract_number});
												
												var CNId = CN.save();
												
												
												
											}
											
											if(flagCustomerExist)
											{
												objReturn = {
													error : false,
													msg : "Customer already exits. ID: " + CRId + ". New Contract Number has been created successfully. ID: " + CNId,
													id : CRId
												};
											}
											else
											{
												objReturn = {
													error : false,
													msg : "New Customer has been created successfully. ID: " + CRId + APOId + ". New Contract Number has been created successfully. ID: " + CNId,
													id : CRId
												};
											}
									}
									else
									{
										objReturn = {
											error : true,
											msg : "Duplicate Contract Number: " + objRequest.data.contract_number,
											id : 0
										};
									}
							}
							else
							{
								objReturn = {
									error : true,
									msg : "Missing Required Fields in Customer Record.",
									id : 0
								};
							}
								
						}
						else
						{
							objReturn = {
								error : true,
								msg : "Missing Required Fields in Customer Record.",
								id : 0
							};
						}
					}
					else if(objRequest.type == 'invoice'){
						objReturn = createInvoice(objRequest.data);
					}
					else if(objRequest.type == 'vendorbill')
					{
						objReturn = createVendorBill(objRequest.data);
					}
					else
					{
						objReturn = {
								error : true,
								msg : "Invalid Request Type Parameter",
								id : 0
							};
					}
				}
				catch(ex){
					objReturn = {
								error : true,
								msg : "Error occured in CarSome POST request." + ex.toString(),
								id : 0
							};
				}
				
				
			}
			
			log.debug('objReturn',objReturn);
			return objReturn;
		}
 
        /**
         * Function called upon sending a GET request to the RESTlet.
         *
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.1
         */
        function doGet() {
 
        }
 
        /**
         * Function called upon sending a PUT request to the RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
         * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.2
         */
        function doPut(requestBody) {
			log.debug('Hello PUT request', requestBody);
			objReturn = {
							error : false,
							msg : "PUT Request has been received successfully.",
							id : 2
						};
			return objReturn;
        }
 
        /**
         * Function called upon sending a POST request to the RESTlet.
         *
         * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
         * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.2
         */
        function doPost(requestBody) {
           
			var objReturn = main(requestBody,'POST');
			return objReturn;
        }
 
        /**
         * Function called upon sending a DELETE request to the RESTlet.
         *
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.2
         */
        function doDelete(requestParams) {
 
        }
 
        return {
            'get': doGet,
            'put': doPut,
            'post': doPost,
            'delete': doDelete
        };
 
    });

	
