/*----------------------------------------------------------------------------------------------
		Company Name 	:	Nuvista Technologies Pvt Ltd
		Script Name 	:	OneFM Contract Integration
		Author 			:  	NVT Employee 
		Date            :   07-07-2021 
		Description		:	1. The Script is created for Migrating Sales Order (Contract/Job Order) to OneFM system.
							2. Record should be migrated when status is Approved (Approve button click)
------------------------------------------------------------------------------------------------*/

/**
 *@NApiVersion 2.0
 *@NScriptType UserEventScript
 *@NModuleScope Public
 */
//This function is used to send create/update Sales Order (Contract/Job Order) from NS to OneFM

//define(['N/config','N/format','N/record','N/url','N/runtime','N/http','N/search','N/xml','/SuiteScripts/OneFM Integration Scripts/OneFM_Lib.js'],
define(['N/config', 'N/format', 'N/record', 'N/url', 'N/runtime', 'N/http', 'N/search', 'N/xml', './OneFM_Lib.js', 'N/https'],
	function (config, format, record, url, runtime, http, search, xml, libjs, https) {
		//Begin: AfterSubmit functionality
		function afterSubmitContract_OneFM(context) {
			try {
				log.debug({ title: 'context.type', details: context.type });
				//If Approve button click the Send to OneFM (This is handled with STD approve and event type on DEployment of script, so no any condition require in coding.)

				var currentRec = context.newRecord;

				// loading record and getting value of "CONTRACT TRANSFERED TO ONEFM" (to know record created / updated)
				var loadRecord = record.load({
					type: currentRec.type,
					id: currentRec.id,
					isDynamic: true
				});
				var custom_form = loadRecord.getValue({ fieldId: 'customform' });
				log.debug('custom_form', custom_form);
				if (custom_form == 117 || custom_form == 152) {      //101----Dormitory Contract Form
					var isAlreadyCreated = loadRecord.getValue({ fieldId: 'custbody_ofm_contracttransfered_create' });
					log.debug('isAlreadyCreated ', isAlreadyCreated);
					if (isAlreadyCreated == true) // Checking if Contract Created Checkbox is checked.
					{
						edit_approvedContract_OneFM(context, config, format, record, url, runtime, http, search, xml, https);
					}
					else {
						approvedContract_OneFM(context, config, format, record, url, runtime, http, search, xml, https);
					}
				}
			}
			catch (err) {
				log.debug({ title: 'err', details: err });
				if (err.details) {
					return { "statuscode": "406", "success": "false", "message": err.details }
				} else if (err.code) {
					return { "statuscode": "407", "success": "false", "message": err.code }
				} else if (err.message) {
					return { "statuscode": "408", "success": "false", "message": err.message }
				}
			}
			//End: AfterSubmit functionality
		}
		return {
			afterSubmit: afterSubmitContract_OneFM,
		};
	});

//If Approve button click the Send to OneFM (This is handled with STD approve and event type on DEployment of script, so no any condition require in coding.)
function approvedContract_OneFM(context, config, format, record, url, runtime, http, search, xml, https) {
	try {
		//Begin: If contract is created or copy and approv then send to OneFM
		//if(context.type == "create" || context.type == "copy"  || context.type == "edit") //comment - edit end of the development
		{
			//Begin: Post URL and Header Object 
			var postURL = getOneFmURL();
			log.debug({ title: 'postURL', details: postURL });
			var headerObj = getHeaderObject();
			log.debug({ title: 'headerObj', details: JSON.stringify(headerObj) });




			//End:Post URL and Header Object 

			//Begin: Variable declaration
			var contract_uid = '', contract_price = '', company_name = '', email = '', mailing_address = '', registered_address = '';
			var fax = '', netsuite_contract_id = '', account_manager = '', contract_value = '', unit_id = '', number_of_units = '';
			var contract_doc_url = '', start_date = '', end_date = '', number_of_beds = '';
			var contacts = [], contacts_person_name = '', contacts_phone = '', contacts_email = '', contacts_designation = '', contacts_is_primary = '';
			var cleaning_contract = 'No', utilities = 'No', is_cream_unit = 'No';//CR(cream) 21-02-2023 21-03-2023 Added creamservice
			//End: '',iable declaration

			//Begin:Getting field details from SalesOrder (Contract/Job Order)
			var currentRec = context.newRecord;
			if (nullCheck(currentRec))//If record is created then only all validation will work
			{
				var loadRecord = record.load({
					type: currentRec.type,
					id: currentRec.id,
					isDynamic: true
				});

				contract_uid = currentRec.id;

				// getting contract type value 
				var contract_type = loadRecord.getValue({ fieldId: 'custbody_dormitory_contract_type' });
				log.debug({
					title: 'contract_type===',
					details: contract_type
				});
				log.debug({
					title: 'contract_type=== TYPE',
					details: typeof contract_type
				});
				if (nullCheck(contract_type)) {
					if (contract_type == "2") {
						contract_type = 'RENEW';
					}
					else {
						contract_type = 'NEW';
					}
				}
				else {
					contract_type = 'NEW';
				}
				// end of contract type value

				// getting Old contract id

				var old_contract_id = loadRecord.getValue({ fieldId: 'custbody_dormitory_previouscontract' });
				if (!nullCheck(old_contract_id)) {
					old_contract_id = '';
				}
				// old contract id completed

				var contract_subtotal = loadRecord.getValue({ fieldId: 'subtotal' });
				contract_subtotal = nullCheck(contract_subtotal) ? contract_subtotal : 0;
				var contract_discount = loadRecord.getValue({ fieldId: 'discounttotal' });
				contract_discount = nullCheck(contract_discount) ? contract_discount : 0;
				contract_price = contract_value = parseFloat(contract_subtotal) + parseFloat(contract_discount);
				company_name = loadRecord.getText({ fieldId: 'entity' });
				var company_name_id = loadRecord.getValue({ fieldId: 'entity' });
				if (nullCheck(company_name_id)) {
					var fieldLookUp_enity = search.lookupFields({
						type: search.Type.CUSTOMER,
						id: company_name_id,
						columns: ['email', 'fax', 'isperson', 'companyname', 'custentity_ofm_cus_emailidaccountsinchar']
					});
					//email = fieldLookUp_enity.email; //REplace email with custentity_ofm_cus_emailidaccountsinchar, decided in production UAT 22.11.21
					email = fieldLookUp_enity.custentity_ofm_cus_emailidaccountsinchar;
					fax = fieldLookUp_enity.fax;
					if (nullCheck(fax))
						fax = fax.replace(/[^\d]/g, '');

					company_name = fieldLookUp_enity.companyname;

				}//if(nullCheck(company_name))

				log.debug('company_name', company_name);
				mailing_address = loadRecord.getValue({ fieldId: 'billaddress' });
				if (nullCheck(mailing_address))
					mailing_address = mailing_address.replace(/(?:\\[rn]|[\r\n]+)+/g, ",");

				registered_address = loadRecord.getValue({ fieldId: 'shipaddress' });
				if (nullCheck(registered_address)) {
					registered_address = registered_address.replace(/(?:\\[rn]|[\r\n]+)+/g, ",");
				}

				netsuite_contract_id = loadRecord.getValue({ fieldId: 'tranid' });
				account_manager = loadRecord.getText({ fieldId: 'salesrep' });
				number_of_units = loadRecord.getValue({ fieldId: 'custbody_no_of_unit_dormitory' });
				start_date = loadRecord.getValue({ fieldId: 'startdate' });
				end_date = loadRecord.getValue({ fieldId: 'enddate' });
				number_of_beds = loadRecord.getValue({ fieldId: 'custbody_dormitory_contract_occupants' });

				cleaning_contract = loadRecord.getValue({ fieldId: 'custbody_cleaning_inc_excl' });
				cleaning_contract = (cleaning_contract == true) ? 'Yes' : 'No';
				utilities = loadRecord.getValue({ fieldId: 'custbody_utilities_inc_exc' });
				log.debug('utilities', 'utilities :' + utilities);
				utilities = (utilities == true) ? 'Yes' : 'No';
				is_cream_unit = loadRecord.getValue({ fieldId: 'custbody_custrecord_crmsrv' }); //CR(cream) 21-02-2023 Added creamservice From here to
				// is_cream_unit = (is_cream_unit == true) ? 'Yes' : 'No';
				if (is_cream_unit == false) {
					is_cream_unit = loadRecord.getValue({ fieldId: 'custbodyps_cream_w_white_goods_incld' });
					log.debug('is_cream_unit from With White Good', is_cream_unit);
				}
				log.debug('is_cream_unit from With Without White Good', is_cream_unit);
				is_cream_unit = (is_cream_unit == true) ? 'Yes' : 'No';
				log.debug('is_cream_unit', 'is_cream_unit :' + is_cream_unit);
				var cream_start_date = start_date;          //CR(cream) 21-02-2023 Added creamservicedate // //Format - ""01 Jan 2000"",
				log.debug('cream_start_date', 'cream_start_date :' + cream_start_date);
				// if(nullCheck(start_date))
				// {
				//cream_start_date = formatDate(start_date);
				// } 
				if (is_cream_unit == true) {                                                                //CR(cream) 21-02-2023 if creamunit is checked date should not empty                                                       
					if (!nullCheck(cream_start_date)) {

						alert("Cream start date is empty")
						return { "statuscode": "408", "success": "false", "message": "Cream start date is empty" }

					}
				}



				//Begin: Dormitory Line Item Fields,Get Dormitory Unit No field and ONeFM Unit Itenrnal id with lookup
				var dormitory_count = loadRecord.getLineCount({ sublistId: 'recmachcustrecord_dormitory_salesorderref' });
				log.debug('dormitory_count', 'dormitory_count :' + dormitory_count);
				if (dormitory_count > 0) {
					var unit_no = loadRecord.getSublistValue({
						sublistId: 'recmachcustrecord_dormitory_salesorderref',
						fieldId: 'custrecord_dormitory_unitno',
						line: 0
					});
					//Fome UNIT NO field,search ONEFM INTERNAL ID
					if (nullCheck(unit_no)) {
						var fieldLookUp_Unit = search.lookupFields({
							type: 'customrecord_dormitory_unitmaster',
							id: unit_no,
							columns: ['custrecord_onefminternalid']
						});
						if (nullCheck(fieldLookUp_Unit))
							unit_id = fieldLookUp_Unit.custrecord_onefminternalid;
					}
				}//if(dormitory_count > 0)
				//End: Dormitory Line Item Fields,

				//Begin: Customer/Company Contact Details

				var custContactSearchResult = companyContactSearch(search, company_name_id, xml);
				log.debug('custContactSearchResult', 'custContactSearchResult :' + JSON.stringify(custContactSearchResult));
				//End: Customer/Company Contact Details						
				//Begin: Convert date into OneFM date format
				var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

				if (nullCheck(start_date)) {
					log.debug('date_before_buffer_days', start_date)
					var buffer_days = loadRecord.getText({ fieldId: 'custbody_ofm_unitavailabilitybufferday' });
					if (!nullCheck(buffer_days)) { buffer_days = 0; }
					start_date.setDate(start_date.getDate() - Number(buffer_days));
					log.debug('date_after_buffer_days', start_date)
					var date = start_date.getDate()
					if (date < 10) date = '0' + date;
					var Month = monthNames[start_date.getMonth()];
					var Year = start_date.getFullYear()
					start_date = date + ' ' + Month + ' ' + Year;
					log.debug('finaldate', start_date)
				}
				if (nullCheck(cream_start_date))    //CR(cream) 21-02-2023
				{
					log.debug('date_before_buffer_days', cream_start_date)
					var buffer_days = loadRecord.getText({ fieldId: 'custbody_ofm_unitavailabilitybufferday' });
					if (!nullCheck(buffer_days)) { buffer_days = 0; }
					cream_start_date.setDate(cream_start_date.getDate() - Number(buffer_days));
					log.debug('date_after_buffer_days', cream_start_date)
					var date = cream_start_date.getDate()
					if (date < 10) date = '0' + date;
					var Month = monthNames[cream_start_date.getMonth()];
					var Year = cream_start_date.getFullYear()
					cream_start_date = date + ' ' + Month + ' ' + Year;
					log.debug('finaldate', cream_start_date)
				}
				if (nullCheck(end_date)) {
					var date = end_date.getDate()
					if (date < 10) date = '0' + date;
					var Month = monthNames[end_date.getMonth()];
					var Year = end_date.getFullYear()
					end_date = date + ' ' + Month + ' ' + Year;
				}

				//End:Getting field details from SalesOrder (Contract/Job Order)
				//Do EscapeXML for string data and then preapare POst array to send
				//	contract_uid=				xml.escape({contract_uid : contract_uid}); //api not working on numebr
				company_name_id = xml.escape({ xmlText: company_name_id });
				company_name = xml.escape({ xmlText: company_name });
				email = xml.escape({ xmlText: email });
				mailing_address = xml.escape({ xmlText: mailing_address });
				registered_address = xml.escape({ xmlText: registered_address });
				fax = xml.escape({ xmlText: fax });
				netsuite_contract_id = xml.escape({ xmlText: netsuite_contract_id });
				account_manager = xml.escape({ xmlText: account_manager });
				//contract_value=             xml.escape({xmlText : contract_value});	//api not working on numebr
				unit_id = xml.escape({ xmlText: unit_id });
				//number_of_beds=             xml.escape({xmlText : number_of_beds});	//api not working on numebr
				contract_doc_url = xml.escape({ xmlText: contract_doc_url });
				start_date = xml.escape({ xmlText: start_date });
				end_date = xml.escape({ xmlText: end_date });
				cleaning_contract = xml.escape({ xmlText: cleaning_contract });
				utilities = xml.escape({ xmlText: utilities });
				is_cream_unit = xml.escape({ xmlText: is_cream_unit }); //CR(cream) 21-02-2023 Added creamservice 
				cream_start_date = xml.escape({ xmlText: cream_start_date }); //CR(cream) 21-02-2023 Added creamservice date



				//Begin: Prepare Array to send to OneFM in Post method
				var postarray = {
					"contract_uid": contract_uid,
					"netsuite_company_id": company_name_id,
					//"contract_price":contract_price ,
					"company_name": company_name,
					"email": email,
					"mailing_address": mailing_address,
					"registered_address": registered_address,
					"fax": fax,
					"netsuite_contract_id": netsuite_contract_id,
					"account_manager": account_manager,
					"contract_value": contract_value,
					"unit_id": unit_id,
					"number_of_beds": number_of_beds,
					//"number_of_units":number_of_units,
					"contract_doc_url": contract_doc_url,
					"start_date": start_date,					//Format - "01 Aug 2021",
					"end_date": end_date,						//Format - "30 Aug 2021",
					//"number_of_units":number_of_units,
					"contacts": custContactSearchResult,
					"cleaning_contract": cleaning_contract,
					"utilities": utilities,
					"is_cream_unit": is_cream_unit,             //CR(cream) 21-02-2023 Added creamservice
					"cream_start_date": cream_start_date,     //CR(cream) 21-02-2023 Added creamservice date 
					"old_contract_id": old_contract_id,
					"contract_type": contract_type,

				}
				log.debug('postarray', 'postarray :' + JSON.stringify(postarray));


				var response = https.post({
					url: postURL,
					body: JSON.stringify(postarray),
					headers: headerObj
				});
				loadRecord.setValue({ fieldId: 'custbody_ofm_onefmrequestfield', value: JSON.stringify(postarray) });
				if (nullCheck(response)) {
					log.debug('PostMethod', 'response Code:' + response.code + 'response body:' + response.body);
					var oneFmResponse = "Response Code : " + response.code + " Response Body : " + response.body;

					loadRecord.setValue({ fieldId: 'custbody_ofm_contractcreate_response', value: oneFmResponse });
					if (response.code == 200) {
						loadRecord.setValue({ fieldId: 'custbody_ofm_contracttransfered_create', value: true });

					}
				}
				loadRecord.save();

			}//if(nullCheck(currentRec))
			//End: Prepare Post data to send to OneFM in Post method
		}//if(context.type == "create" || context.type == "copy"  
		//End: If contract is created or copy and approv then send to OneFM
	}
	catch (err) {
		log.debug({ title: 'err', details: err });
		if (err.details) {
			return { "statuscode": "406", "success": "false", "message": err.details }
		} else if (err.code) {
			return { "statuscode": "407", "success": "false", "message": err.code }
		} else if (err.message) {
			return { "statuscode": "408", "success": "false", "message": err.message }
		}
	}

}

//EDIT (CONTRACT TRANSFERED TO ONEFM Checkbox is Checked) : If Approve button click the Send to OneFM (This is handled with STD approve and event type on DEployment of script, so no any condition require in coding.)
function edit_approvedContract_OneFM(context, config, format, record, url, runtime, http, search, xml, https) {
	try {
		log.debug("edit_approvedContract_OneFM")
		//Begin: Post URL and Header Object 

		//var postURL = 'http://dev.mesonefm.com.sg/api/netsuite/lead/contract/edit';
		var postURL = getURL_fun() + "api/netsuite/lead/contract/edit";
		log.debug({ title: 'postURL', details: postURL });
		var headerObj = getHeaderObject();
		log.debug({ title: 'headerObj', details: JSON.stringify(headerObj) });

		//End:Post URL and Header Object 


		//Begin: Variable declaration
		var netsuite_contract_id = '', contract_value = '', is_cream_unit = '', cream_start_date = '';  //CR(cream) 21-02-2023 Added the variables of creamunit and date
		var terminated_units_array = [], new_units_array = [], updated_units_array = [];

		//End: '',iable declaration


		//Begin:Getting field details from SalesOrder (Contract/Job Order)
		var currentRec = context.newRecord;
		if (nullCheck(currentRec))//If record is created then only all validation will work
		{
			var loadRecord = record.load({
				type: currentRec.type,
				id: currentRec.id,
				isDynamic: true
			});

			contract_uid = currentRec.id;

			var isAlreadyCreated = loadRecord.getValue({ fieldId: 'custbody_ofm_contracttransfered_create' });
			log.debug('isAlreadyCreated ', isAlreadyCreated);

			if (isAlreadyCreated == true) // Checking if Contract Created Checkbox is checked.
			{
				log.debug("inif", "inif");
				var company_name_id = loadRecord.getValue({ fieldId: 'entity' });
				var number_of_beds = loadRecord.getValue({ fieldId: 'custbody_dormitory_contract_occupants' });

				netsuite_contract_id = loadRecord.getValue({ fieldId: 'tranid' });
				log.debug('netsuite_contract_id ', netsuite_contract_id);
				var contract_subtotal = loadRecord.getValue({ fieldId: 'subtotal' });
				contract_subtotal = nullCheck(contract_subtotal) ? contract_subtotal : 0;
				var contract_discount = loadRecord.getValue({ fieldId: 'discounttotal' });
				contract_discount = nullCheck(contract_discount) ? contract_discount : 0;
				log.debug("contract_discount", contract_discount)
				contract_value = parseFloat(contract_subtotal) + parseFloat(contract_discount);
				log.debug('contract_value ', contract_value);
				is_cream_unit = loadRecord.getValue({ fieldId: 'custbody_custrecord_crmsrv' }); //CR(cream) 21-02-2023 Added creamservice From here to
				// is_cream_unit = (is_cream_unit == true) ? 'Yes' : 'No';
				if (is_cream_unit == false) {
					is_cream_unit = loadRecord.getValue({ fieldId: 'custbodyps_cream_w_white_goods_incld' });
					log.debug('is_cream_unit from With White Good', is_cream_unit);
				}
				log.debug('is_cream_unit from With Without White Good', is_cream_unit);
				is_cream_unit = (is_cream_unit == true) ? 'Yes' : 'No';
				log.debug('is_cream_unit', 'is_cream_unit :' + is_cream_unit);

				log.debug('is_cream_unit', is_cream_unit)
				cream_start_date = loadRecord.getText({ fieldId: 'startdate' });    //CR(cream) 21-02-2023 Added creamservice date

				log.debug("cream_start_date", cream_start_date)

				var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

				if (nullCheck(cream_start_date))                              //CR(cream) 21-02-2023 
				{
					log.debug('date_before_buffer_days', cream_start_date)
					var buffer_days = loadRecord.getText({ fieldId: 'custbody_ofm_unitavailabilitybufferday' });
					if (!nullCheck(buffer_days)) { buffer_days = 0; }
					cream_start_date.setDate(cream_start_date.getDate() - Number(buffer_days));
					log.debug('date_after_buffer_days', cream_start_date)
					var date = cream_start_date.getDate()
					if (date < 10) date = '0' + date;
					var Month = monthNames[cream_start_date.getMonth()];
					var Year = cream_start_date.getFullYear()
					cream_start_date = date + ' ' + Month + ' ' + Year;
					log.debug('finaldate', cream_start_date)
				}
				//Begin: Dormitory Line Item Fields,Get Dormitory Unit No field and ONeFM Unit Itenrnal id with lookup
				var dormitory_count = loadRecord.getLineCount({ sublistId: 'recmachcustrecord_dormitory_salesorderref' });
				log.debug('dormitory_count', 'dormitory_count :' + dormitory_count);

				if (dormitory_count > 0) {

					if (dormitory_count == 1) {
						var unit_id;

						for (var i = 0; i < dormitory_count; i++) {
							//START : From UNIT NO field,search ONEFM INTERNAL ID
							var unit_no = loadRecord.getSublistValue({
								sublistId: 'recmachcustrecord_dormitory_salesorderref',
								fieldId: 'custrecord_dormitory_unitno',
								line: i
							});

							if (nullCheck(unit_no)) {
								var fieldLookUp_Unit = search.lookupFields({
									type: 'customrecord_dormitory_unitmaster',
									id: unit_no,
									columns: ['custrecord_onefminternalid']
								});
								if (nullCheck(fieldLookUp_Unit))
									unit_id = fieldLookUp_Unit.custrecord_onefminternalid;
							}
							//END : From UNIT NO field,search ONEFM INTERNAL ID

							var block_no = loadRecord.getSublistValue({
								sublistId: 'recmachcustrecord_dormitory_salesorderref',
								fieldId: 'custrecord_dormitory_block',
								line: i
							});

							var start_date = loadRecord.getSublistValue({
								sublistId: 'recmachcustrecord_dormitory_salesorderref',
								fieldId: 'custrecord_dormitory_startdate',
								line: i
							});
							if (nullCheck(start_date)) {
								start_date = formatDate(start_date);
							}

							var termination_date = loadRecord.getSublistValue({
								sublistId: 'recmachcustrecord_dormitory_salesorderref',
								fieldId: 'custrecord_dormitory_terminationdate',
								line: i
							});
							if (nullCheck(termination_date)) {
								termination_date = formatDate(termination_date);
							}

							var isTerminated = loadRecord.getSublistValue({
								sublistId: 'recmachcustrecord_dormitory_salesorderref',
								fieldId: 'custrecord_ofm_contract_unitterminated',
								line: i
							});

							var termination_type = loadRecord.getSublistValue({
								sublistId: 'recmachcustrecord_dormitory_salesorderref',
								fieldId: 'custrecord_dormitory_terminationtype',
								line: i
							});

							var is_line_updated = loadRecord.getSublistValue({
								sublistId: 'recmachcustrecord_dormitory_salesorderref',
								fieldId: 'custrecord_ofm_dormitory_unitupdated',
								line: i
							});

							// log.debug('i ', i);
							// log.debug('onefm_internal_unit_id ', unit_id);
							// log.debug('onefm_internal_block_id ', block_no);
							// log.debug('date_of_termination ', termination_date);
							// log.debug('start_date ', start_date);
							// log.debug('isTerminated ', isTerminated);
							if (termination_type == 1) {
								var rec =
								{
									"onefm_internal_unit_id": unit_id,
									"onefm_internal_block_id": block_no,
									"date_of_termination": termination_date
								}
								terminated_units_array.push(rec);

							}
							else {

								if (isTerminated == true) {
									var rec =
									{
										"onefm_internal_unit_id": unit_id,
										"onefm_internal_block_id": block_no,
										"date_of_termination": termination_date
									}
									terminated_units_array.push(rec);
								}
								else {
									// if(is_line_updated==true)
									// {
									// 	var rec = 
									// 	{
									// 		"onefm_internal_unit_id" : unit_id,			
									// 		"onefm_internal_block_id" : block_no,			
									// 		"start_date" : start_date,			
									// 		"end_date" : termination_date,
									// 		"number_of_beds":number_of_beds,
									// 		"is_cream_unit" : is_cream_unit,         //CR(cream) 21-02-2023 Added creamservice
									// 		"cream_start_date" : cream_start_date    //CR(cream) 21-02-2023 Added creamservice date
									// 	}
									// 	updated_units_array.push(rec);
									// }
									// else{

									var rec =
									{
										"onefm_internal_unit_id": unit_id,
										"onefm_internal_block_id": block_no,
										"start_date": start_date,
										"end_date": termination_date,
										"number_of_beds": number_of_beds,
										"is_cream_unit": is_cream_unit,            //CR(cream) 21-02-2023 Added creamservice
										"cream_start_date": cream_start_date       //CR(cream) 21-02-2023 Added creamservice date
									}
									new_units_array.push(rec);
									updated_units_array.push(rec);
									// }
								}
							}
						}
					}
					else {
						var unit_id;

						for (var i = 0; i < dormitory_count; i++) {
							//START : From UNIT NO field,search ONEFM INTERNAL ID
							var unit_no = loadRecord.getSublistValue({
								sublistId: 'recmachcustrecord_dormitory_salesorderref',
								fieldId: 'custrecord_dormitory_unitno',
								line: i
							});

							if (nullCheck(unit_no)) {
								var fieldLookUp_Unit = search.lookupFields({
									type: 'customrecord_dormitory_unitmaster',
									id: unit_no,
									columns: ['custrecord_onefminternalid']
								});
								if (nullCheck(fieldLookUp_Unit))
									unit_id = fieldLookUp_Unit.custrecord_onefminternalid;
							}
							//END : From UNIT NO field,search ONEFM INTERNAL ID

							var block_no = loadRecord.getSublistValue({
								sublistId: 'recmachcustrecord_dormitory_salesorderref',
								fieldId: 'custrecord_dormitory_block',
								line: i
							});

							var start_date = loadRecord.getSublistValue({
								sublistId: 'recmachcustrecord_dormitory_salesorderref',
								fieldId: 'custrecord_dormitory_startdate',
								line: i
							});
							if (nullCheck(start_date)) {
								start_date = formatDate(start_date);
							}

							var termination_date = loadRecord.getSublistValue({
								sublistId: 'recmachcustrecord_dormitory_salesorderref',
								fieldId: 'custrecord_dormitory_terminationdate',
								line: i
							});
							if (nullCheck(termination_date)) {
								termination_date = formatDate(termination_date);
							}

							var isTerminated = loadRecord.getSublistValue({
								sublistId: 'recmachcustrecord_dormitory_salesorderref',
								fieldId: 'custrecord_ofm_contract_unitterminated',
								line: i
							});

							var is_line_updated = loadRecord.getSublistValue({
								sublistId: 'recmachcustrecord_dormitory_salesorderref',
								fieldId: 'custrecord_ofm_dormitory_unitupdated',
								line: i
							});

							// log.debug('i ', i);
							// log.debug('onefm_internal_unit_id ', unit_id);
							// log.debug('onefm_internal_block_id ', block_no);
							// log.debug('date_of_termination ', termination_date);
							// log.debug('start_date ', start_date);
							// log.debug('isTerminated ', isTerminated);

							if (isTerminated == true) {
								var rec =
								{
									"onefm_internal_unit_id": unit_id,
									"onefm_internal_block_id": block_no,
									"date_of_termination": termination_date
								}
								terminated_units_array.push(rec);
							}
							else {
								// if(is_line_updated==true)
								// {
								// 	var rec = 
								// 	{
								// 		"onefm_internal_unit_id" : unit_id,			
								// 		"onefm_internal_block_id" : block_no,			
								// 		"start_date" : start_date,			
								// 		"end_date" : termination_date,
								// 		"number_of_beds":number_of_beds,
								// 		"is_cream_unit":is_cream_unit,        //CR(cream) 21-02-2023 Added creamservice
								// 		"cream_start_date":cream_start_date    //CR(cream) 21-02-2023 Added creamservice date
								// 	}
								// 	updated_units_array.push(rec);
								// }
								// else{

								var rec =
								{
									"onefm_internal_unit_id": unit_id,
									"onefm_internal_block_id": block_no,
									"start_date": start_date,
									"end_date": termination_date,
									"number_of_beds": number_of_beds,
									"is_cream_unit": is_cream_unit,      //CR(cream) 21-02-2023 Added creamservice
									"cream_start_date": cream_start_date //CR(cream) 21-02-2023 Added creamservice date
								}
								new_units_array.push(rec);
								updated_units_array.push(rec);
								// }
							}
						}
					}
				}

				log.debug('terminated_units_array ', JSON.stringify(terminated_units_array));
				log.debug('new_units_array ', JSON.stringify(new_units_array));
				var edited_by = runtime.getCurrentUser().name;

				var postarray = {
					"netsuite_contract_no": netsuite_contract_id,                //CR 24.11.22  
					"netsuite_contract_id": contract_uid,
					"terminated_units": terminated_units_array,
					"new_units": new_units_array,
					"updated_units": updated_units_array,
					"contract_value": contract_value,
					"netsuite_client_id": company_name_id,
					"contract_edited_by": edited_by

				}
				log.debug('postarray', 'postarray :' + JSON.stringify(postarray));


				var response = https.post({
					url: postURL,
					body: JSON.stringify(postarray),
					headers: headerObj
				});
				loadRecord.setValue({ fieldId: 'custbody_ofm_contract_editedofmrequest', value: JSON.stringify(postarray) });
				if (nullCheck(response)) {
					log.debug('PostMethod', 'response Code:' + response.code + 'response body:' + response.body);
					var oneFmResponse = "Response Code : " + response.code + " Response Body : " + response.body;

					loadRecord.setValue({ fieldId: 'custbody_ofm_contract_editedcontractre', value: oneFmResponse });
					if (response.code == 200) {
						loadRecord.setValue({ fieldId: 'custbody_ofm_contract_editconttransfer', value: true });
						loadRecord.setValue({ fieldId: 'custbody_ofm_update_contract_unit_deta', value: false });		//code added on 17.12.21-For approved contract edit issue
					}
					else {
						loadRecord.setValue({ fieldId: 'custbody_ofm_onfmeditfailcheck', value: true });
						loadRecord.setValue({ fieldId: 'custbody_ofm_update_contract_unit_deta', value: false });		//code added on 17.12.21-For approved contract edit issue                     
					}

				}
				loadRecord.save();


			}
		}


	}
	catch (err) {
		log.debug({ title: 'err', details: err });
		if (err.details) {
			return { "statuscode": "406", "success": "false", "message": err.details }
		}
		else if (err.code) {
			return { "statuscode": "407", "success": "false", "message": err.code }
		}
		else if (err.message) {
			return { "statuscode": "408", "success": "false", "message": err.message }
		}
	}
}


function formatDate(dateValue) {
	var finalDate;

	var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

	var date = dateValue.getDate()
	if (date < 10) date = '0' + date;
	var Month = monthNames[dateValue.getMonth()];
	var Year = dateValue.getFullYear()
	finalDate = date + ' ' + Month + ' ' + Year;


	return finalDate;
}

