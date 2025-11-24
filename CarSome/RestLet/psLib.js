/* To protect against version incompatibility, this script includes the @NApiVersion tag.
* psLib.js
* @NApiVersion 2.x
*/

define(['N/record','N/search'], function (record,search) {
   
    function splitNameIntoFnameLname(name)
	{
		var fName = "";
		var lName = "";
		
		var nameArray = name.split(' ');
		var nameArrayLength = nameArray.length;
		//log.debug('name array length',nameArray.length);
		
		lName = nameArray[nameArrayLength-1];//last word is lastname
		var fNameTemp = "";
		
		for(var i=0;i<nameArrayLength-1;i++)//loop till second last word
		{
			
			if(fNameTemp != "")
			{
				fNameTemp += " ";
			}
			
			fNameTemp += nameArray[i];
			//log.debug('i',i);
			//log.debug('fNameTemp.length',fNameTemp.length + ' '  + fNameTemp);
			if(fNameTemp.length <= 32)
			{
				fName = fNameTemp;
			}
			else
			{
				//log.debug('more than 32 chars');
				lName = "";
				//log.debug('i',i + ' ' + nameArray[i]);
				
				for(var j=i;j<nameArrayLength;j++)
				{
					if(lName != "")
					{
						lName += " ";
					}
					lName += nameArray[j];
				}
				
				break;
				
			}			
		}
		
		log.debug('fname',fName);
		log.debug('lname',lName);	
		
		return [fName,lName];
		
	}
	
	function splitAddressIn2Lines(address)
	{
		var addressline_1 = "";
		var addressline_2 = "";
		
		
		var addressArray = address.split(' ');
		var addressArrayLength = addressArray.length;
		log.debug('address array length',addressArray.length);
		
		var addressline_1_Temp = "";
		
		for(var i=0;i<addressArrayLength;i++)//loop till last word
		{
			
			if(addressline_1_Temp != "")
			{
				addressline_1_Temp += " ";
			}
			
			addressline_1_Temp += addressArray[i];
			log.debug('i',i);
			log.debug('addressline_1_Temp.length',addressline_1_Temp.length + ' '  + addressline_1_Temp);
			if(addressline_1_Temp.length <= 150)
			{
				addressline_1 = addressline_1_Temp;
			}
			else
			{
				log.debug('more than 150 chars');
				
				log.debug('i',i + ' ' + addressArray[i]);
				
				for(var j=i;j<addressArrayLength;j++)
				{
					if(addressline_2 != "")
					{
						addressline_2 += " ";
					}
					addressline_2 += addressArray[j];
				}
				
				break;
				
			}			
		}
		
		log.debug('addressline_1',addressline_1);
		log.debug('addressline_2',addressline_2);	
		
		return [addressline_1,addressline_2];
		
	}
	
    function ifCustomerDuplicateCMSId(cmsId)
	{
		var returnCustomerId = 0;
		
		var filterCustomerDetails = [];
		filterCustomerDetails[0] = search.createFilter({
			name: "custentity_carsome_cmsid",
			operator: search.Operator.IS,
			values: cmsId
		});

		var searchCustomerDetails = search.create({
			type: search.Type.CUSTOMER,
			columns: [{
			name: 'internalid',
			sort: 'DESC'
			},
			{
			name: 'lastname'
			}],
			filters: filterCustomerDetails
			});
		
			var customerDetailsResultSet = searchCustomerDetails.run().getRange(0,2) || [];
			log.debug('customerDetailsResultSet length',customerDetailsResultSet.length);
							
			if(customerDetailsResultSet.length > 0)
			{
				returnCustomerId = customerDetailsResultSet[0].getValue({name:'internalid'});
				
				if(customerDetailsResultSet.length > 1)
				{
					for(var r=0;r<customerDetailsResultSet.length-1;r++)
					{
						log.debug('length',customerDetailsResultSet[r].getValue({name:'lastname'}).length);
						log.debug('last 3',customerDetailsResultSet[r].getValue({name:'lastname'}).substr(customerDetailsResultSet[0].getValue({name:'lastname'}).length-6,6));
						
						var lastFourLastName = customerDetailsResultSet[r].getValue({name:'lastname'}).substr(customerDetailsResultSet[0].getValue({name:'lastname'}).length-6,6);
						
						if(lastFourLastName == ' - APO')
						{
							returnCustomerId = customerDetailsResultSet[r].getValue({name:'internalid'});
						}
					}
				}
			}
		
		return returnCustomerId;
	}
	
    function ifCustomerDuplicateId(registrationNumber)
	{
		var returnCustomerId = 0;
		
		var filterCustomerDetails = [];
		filterCustomerDetails[0] = search.createFilter({
			name: "custentity_carsome_comregno",
			operator: search.Operator.IS,
			values: registrationNumber
		});

		var searchCustomerDetails = search.create({
			type: search.Type.CUSTOMER,
			columns: [{
			name: 'internalid',
			sort: 'DESC'
			},
			{
			name: 'lastname'
			}],
			filters: filterCustomerDetails
			});
		
			var customerDetailsResultSet = searchCustomerDetails.run().getRange(0,2) || [];
			log.debug('customerDetailsResultSet length',customerDetailsResultSet.length);
							
			if(customerDetailsResultSet.length > 0)
			{
				returnCustomerId = customerDetailsResultSet[0].getValue({name:'internalid'});
				
				if(customerDetailsResultSet.length > 1)
				{
					for(var r=0;r<customerDetailsResultSet.length-1;r++)
					{
						log.debug('length',customerDetailsResultSet[r].getValue({name:'lastname'}).length);
						log.debug('last 3',customerDetailsResultSet[r].getValue({name:'lastname'}).substr(customerDetailsResultSet[0].getValue({name:'lastname'}).length-6,6));
						
						var lastFourLastName = customerDetailsResultSet[r].getValue({name:'lastname'}).substr(customerDetailsResultSet[0].getValue({name:'lastname'}).length-6,6);
						
						if(lastFourLastName == ' - APO')
						{
							returnCustomerId = customerDetailsResultSet[r].getValue({name:'internalid'});
						}
					}
				}
			}
		
		return returnCustomerId;
		
	}
	
	function ifCustomerDuplicateCMSIdAPOManual(cmsId)
	{
		var returnCustomerId = 0;
		
		var filterCustomerDetails = [];
		filterCustomerDetails[0] = search.createFilter({
			name: "custentity_carsome_cmsid",
			operator: search.Operator.IS,
			values: cmsId
		});
		/* filterCustomerDetails[1] = search.createFilter({
			name: "custentity_ps_created_from_ucd",
			operator: search.Operator.IS,
			values: false
		}); */

		var searchCustomerDetails = search.create({
			type: search.Type.CUSTOMER,
			columns: [{
			name: 'internalid',
			sort: 'DESC'
			},
			{
			name: 'altname'
			},
			{
			name: 'custentity_ps_created_from_ucd'
			}],
			filters: filterCustomerDetails
			});
		
			var customerDetailsResultSet = searchCustomerDetails.run().getRange(0,10) || [];
			log.debug('customerDetailsResultSet',customerDetailsResultSet);
							
			if(customerDetailsResultSet.length > 0)
			{
				for(var r=0;r<customerDetailsResultSet.length;r++)
				{
					log.debug('ifcustomercmsidexist id altname',customerDetailsResultSet[r].getValue({name:'internalid'})+' ' + customerDetailsResultSet[r].getValue({name:'altname'}));
					
					var altname = customerDetailsResultSet[r].getValue({name:'altname'});
					if(altname.indexOf(' - APO')>0)
					{					
						returnCustomerId = customerDetailsResultSet[r].getValue({name:'internalid'});
					}
				}				
			}
			
		log.debug('returnCustomerId',returnCustomerId);		
		return returnCustomerId;
		
	}
	
	function ifCustomerDuplicateCMSIdManual(cmsId)
	{
		var returnCustomerId = 0;
		
		var filterCustomerDetails = [];
		filterCustomerDetails[0] = search.createFilter({
			name: "custentity_carsome_cmsid",
			operator: search.Operator.IS,
			values: cmsId
		});
		/* filterCustomerDetails[1] = search.createFilter({
			name: "custentity_ps_created_from_ucd",
			operator: search.Operator.IS,
			values: false
		}); */

		var searchCustomerDetails = search.create({
			type: search.Type.CUSTOMER,
			columns: [{
			name: 'internalid',
			sort: 'DESC'
			},
			{
			name: 'altname'
			},
			{
			name: 'custentity_ps_created_from_ucd'
			}],
			filters: filterCustomerDetails
			});
		
			var customerDetailsResultSet = searchCustomerDetails.run().getRange(0,10) || [];
			log.debug('customerDetailsResultSet',customerDetailsResultSet);
							
			if(customerDetailsResultSet.length > 0)
			{
				for(var r=0;r<customerDetailsResultSet.length;r++)
				{
					log.debug('ifcustomercmsidexist id altname',customerDetailsResultSet[r].getValue({name:'internalid'})+' ' + customerDetailsResultSet[r].getValue({name:'altname'}));
					
					var altname = customerDetailsResultSet[r].getValue({name:'altname'});
					if(altname.indexOf(' - APO')>0)
					{
					}
					else
					{
						returnCustomerId = customerDetailsResultSet[r].getValue({name:'internalid'});
					}
				}				
			}
			
		log.debug('returnCustomerId',returnCustomerId);		
		return returnCustomerId;
		
	}
	
	function getUCDMemo(UCDType,customerName,postingPeriod)
	{
		var returnMemo = '-';
		
		switch(UCDType)
		{
			case 'HP-NEWAGRT':
				returnMemo = 'New Hire Purchase Agreement - ' + customerName;
				break;
				
			case 'HP-COLL':
				returnMemo = 'Hire Purchases Collection - ' + postingPeriod + ' - ' + customerName;
				break;
				
			case 'HP-DEBIT':
				returnMemo = 'Back Charge - ' + customerName;
				break;
				
			case 'HP-SETTLE':
				returnMemo = 'Final Settlement - ' + customerName;
				break;
				
			case 'HP-MTHINTEREST':
				returnMemo = 'Interest Income - ' + postingPeriod;
				break;
				
			case 'APO-NEWAGRT':
				returnMemo = 'New APO - ' + customerName;
				break;
				
				
			case 'APO-MTHINTEREST':
				returnMemo = 'APO Accrued Interest - ' + postingPeriod;
				break;
				
				
			case 'APO-SETTLE':
				returnMemo = 'APO Settlement - ' + customerName;
				break;
				
		}
		
		log.debug('returnMemo');
		
		return returnMemo;
	}
	
	function getCreditCustomerIDFromContractNumber(contractNumber)
	{
		var customerId = getCustomerIDFromContractNumber(contractNumber);
		log.debug('customerId1',customerId);
		
		if(customerId > 0)
		{
			//check if it is APO customer
			var srchCustomer = search.lookupFields({
						type: 'customer',
						id: customerId,
						columns: ['altname','custentity_carsome_cmsid']
					});
			log.debug('srchCustomer',srchCustomer);
			var altname = srchCustomer.altname;
			var cmsId = srchCustomer.custentity_carsome_cmsid;
			log.debug('altname',altname);
			log.debug('cmsId',cmsId);
			
			if(altname.indexOf(' - APO')>0)
			{
				log.debug('inside apo',cmsId);
				
				//find regular customer
				var filterArray = [];
				filterArray[0] = search.createFilter({
					name: "custentity_carsome_cmsid",
					operator: search.Operator.IS,
					values: cmsId
				});
				filterArray[1] = search.createFilter({
					name: "internalid",
					operator: search.Operator.NONEOF,
					values: [customerId]
				});

				var searchResultDetails = search.create({
					type: search.Type.CUSTOMER,
					columns: [{
					name: 'internalid'
					}],
					filters: filterArray
					});
				
					var resultDetailsResultSet = searchResultDetails.run().getRange(0,1) || [];
					log.debug('resultDetailsResultSet',resultDetailsResultSet);
					
					if(resultDetailsResultSet.length > 0)
					{
						customerId = resultDetailsResultSet[0].id;
						log.debug('customerId2',customerId);
					}
			}
		}
		
		return customerId;
	}
	
    function getCustomerIDFromContractNumber(contractNumber) {
     
        log.debug('contractNumber',contractNumber);
		
		var customerId = 0;
		
		//find custom record with this contract number
		var filterArray = [];
		filterArray[0] = search.createFilter({
			name: "custrecord_ps_contract_num",
			operator: search.Operator.IS,
			values: contractNumber
		});
		

		var searchResultDetails = search.create({
			type: 'customrecord_ps_customer_contract_num',
			columns: [{
			name: 'custrecord_ps_customer'
			}],
			filters: filterArray
			});
		
			var resultDetailsResultSet = searchResultDetails.run().getRange(0,1) || [];
			log.debug('resultDetailsResultSet length',resultDetailsResultSet.length);
							
			if(resultDetailsResultSet.length > 0)
			{
				var result1 = resultDetailsResultSet[0];
				log.debug('result1',result1);
				
				log.debug('custrecord_ps_customer',result1.getValue({name: 'custrecord_ps_customer'}));
				customerId = result1.getValue({name: 'custrecord_ps_customer'});
			}
			else
			{
				customerId = 0;
			}
							
			log.debug('customerId',customerId);
			return customerId;
	}
	
	function getTransTypeList()
	{
		
		//find custom list
		var transTypeList = []; //[{'id':'1','name':'HP-NEW'},{'id':'2','name':'HP-COLL'}]
		
		var searchResultDetails = search.create({
			type: 'customlist_carsome_transtypelist',
			columns: [{
			name: 'internalid'
			},
			{
			name: 'name'
			}]
			});
		
			var resultDetailsResultSet = searchResultDetails.run().getRange(0,100) || [];
			log.debug('resultDetailsResultSet length',resultDetailsResultSet.length);
							
			if(resultDetailsResultSet.length > 0)
			{
				for(var i=0;i<resultDetailsResultSet.length - 1;i++)
				{
					var result1 = resultDetailsResultSet[i];
				
					//log.debug('result',result1);
					transTypeList.push({'id':result1.id,'name':result1.getValue({'name':'name'}).replace('\t','')});
				}
				
			}
			
							
			log.debug('transTypeList',transTypeList);
			return transTypeList;
	}

	function getTransTypeId(transactionName,transactionArray)
	{
		log.debug('transactionName',transactionName);
		
		var transactionTypeId = 1;
		
		transactionArray.forEach(function(list){ 
		//log.debug('tname',transactionName+' ' +list.name); 
		if(list.name.trim()==transactionName) 
		{
			log.debug('inside'); transactionTypeId = list.id} 
		});
		log.debug('srchresult',transactionTypeId);
		
		return transactionTypeId;
	}
	

	function getTransactionTypeId(transactionName) {
     
        log.debug('transactionName',transactionName);
		
		var transactionTypeId = 1;
		
		//find custom record with this contract number
		var filterArray = [];
		filterArray[0] = search.createFilter({
			name: "name",
			operator: search.Operator.IS,
			values: transactionName
		});

		var searchResultDetails = search.create({
			type: 'customlist_carsome_transtypelist',
			columns: [{
			name: 'internalid'
			}],
			filters: filterArray
			});
		
			var resultDetailsResultSet = searchResultDetails.run().getRange(0,1) || [];
			log.debug('resultDetailsResultSet length',resultDetailsResultSet.length);
							
			if(resultDetailsResultSet.length > 0)
			{
				var result1 = resultDetailsResultSet[0];
				
				log.debug('result',result1);
				transactionTypeId = result1.id;
			}
			else
			{
				transactionTypeId = 11;
			} 
							
			log.debug('transactionTypeId',transactionTypeId);
			return transactionTypeId;
	}

    return {
        getCustomerIDFromContractNumber: getCustomerIDFromContractNumber,
		getUCDMemo: getUCDMemo,
		ifCustomerDuplicateId: ifCustomerDuplicateId,
		ifCustomerDuplicateCMSIdManual: ifCustomerDuplicateCMSIdManual,
		ifCustomerDuplicateCMSId: ifCustomerDuplicateCMSId,
		getTransactionTypeId: getTransactionTypeId,
		splitNameIntoFnameLname: splitNameIntoFnameLname,
		splitAddressIn2Lines: splitAddressIn2Lines,
		getTransTypeId: getTransTypeId,
		getTransTypeList: getTransTypeList,
		getCreditCustomerIDFromContractNumber: getCreditCustomerIDFromContractNumber,
		ifCustomerDuplicateCMSIdAPOManual: ifCustomerDuplicateCMSIdAPOManual
    };

});
