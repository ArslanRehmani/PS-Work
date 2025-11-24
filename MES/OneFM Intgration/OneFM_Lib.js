function nullCheck(value)
{
	if (value != null && value != '' && value != undefined)
		return true;
	else
		return false;
}

function companyContactSearch(search, companyid,xml)
{
	var companyContactSearchResult = [];
				var companyContactSearchObj = search.create({
				   type: "customer",
				   filters:
				   [
					  ["internalid","anyof", companyid],"AND", ["contact.isinactive","is","F"]
				   ],
				   columns:
				   [
					  search.createColumn({ name: "internalid",  label: "Internal ID"}),
					  search.createColumn({ name: "internalid",	 join: "contact",	label: "InternalID"	}),
					  search.createColumn({ name: "entityid",	 join: "contact",	label: "Name"	}),
					  search.createColumn({ name: "email",		 join: "contact",	label: "Email"	}),
					  search.createColumn({ name: "phone",		 join: "contact",	label: "Phone"	}),
					  search.createColumn({ name: "contactrole", join: "contact",	label: "role"}) ,
                      search.createColumn({ name: "mobilephone", join: "contact",	label: "Mobile Phone"}) 					  
				   ]
				});
			
			var searchResult = companyContactSearchObj.run().getRange(0, 1000);
			if(nullCheck(searchResult))
			{
				for (var i = 0; i < searchResult.length; i++) {
					
					var designation;
					var isPrimary = false;
					var roleId =  xml.escape({  xmlText : searchResult[i].getValue({name: "contactrole", join: "contact"})    });
// Commented following code on 16-Nov-2021 for role change					
				/*	if(roleId == -10){
						designation = 'Primary';
						isPrimary = true;
					}*/
					// Added following code on 16-Nov-2021 to set new roles.
					if(roleId == 3)
					{
						designation = 'Primary';
						isPrimary = true;
					}
					else if(roleId == 1){
						designation = 'Director In-Charge';
					}
					else if(roleId == 2){
						designation = 'Operations In-Charge';
					}
					// Added following code on 16-Nov-2021 to set new roles.
					else if(roleId == -10)
					{
						designation = 'Accounts In-Charge';
					}
					// Commented following code on 16-Nov-2021 for role change
					/*else if(roleId == 3){
						designation = 'Accounts In-Charge';
					}
					else{
						designation = xml.escape({  xmlText :   searchResult[i].getText({name: "contactrole", join: "contact"})     });
					}*/
					
					var phone = '';
					phone = searchResult[i].getValue({name: "phone", join: "contact"});
					if(nullCheck(phone))
						phone =  xml.escape({  xmlText :   phone.replace(/[^\d]/g, '')    });
					
					var mobile_number = '';
					mobile_number = searchResult[i].getValue({name: "mobilephone", join: "contact"});
					if(nullCheck(mobile_number))
						mobile_number =  xml.escape({  xmlText :   mobile_number.replace(/[^\d]/g, '')    });
					
					var rec = 
					{
						"netsuite_contact_id" : xml.escape({  xmlText :   searchResult[i].getValue({name: "internalid", join: "contact"})       }),
						"person_name" : xml.escape({  xmlText :   searchResult[i].getValue({name: "entityid", join: "contact"})       }),			
						"email" : xml.escape({  xmlText :   searchResult[i].getValue({name: "email", join: "contact"})       }),			
						"phone" : phone,			
						"designation" : designation,
						"is_primary" : isPrimary,
						"mobile" :mobile_number
					}
					companyContactSearchResult.push(rec);
				}
			}
  //alert('companyContactSearchResult : '+JSON.stringify(companyContactSearchResult));
			return companyContactSearchResult;
}

function getOneFmURL()
{
	//var postURL = 'http://dev.mesonefm.com.sg/api/netsuite/lead/unit/allocation';
	// var postURL = 'https://www.mesonefm.com.sg/api/netsuite/lead/unit/allocation';
	var postURL = 'https://staging.one-fm.com.sg/api/netsuite/lead/unit/allocation';
	
	return postURL;
}

function getHeaderObject()
{
//	Authorization: Token TPZyNDQT39SZKhUrQmYcyWRlOvtNgwpN
//client-secret: HUiy6Yg3iyc0c43tlbLxPPuRKeqwxGnC08rDAlvYF9nMddDB
//client-id: d182de0c-3b23-4d6f-8b63-fd70321beb16

	var headerObj = {
						"Authorization": "Token pPahNeMLJXn9WidIFDqyxZUq8KKzgloj",
						"client-id": "1fc3cf91-a316-4d93-9f9f-f5e3feb6cee6",
						"client-secret": "XzcwjPTFkegtMCMHgelL5bR31y1Ca7BRbRGQiXdFIWJxs1OT",
						"Content-Type": "application/json",
						"Accept": "application/json"
	  };
	  
	return headerObj;
}

function getURL_fun()
{
	// var postURL = 'http://staging.mesonefm.com.sg/';
	var postURL = 'https://staging.one-fm.com.sg/';
	// var postURL = 'https://www.mesonefm.com.sg/'
	
	return postURL;
}

function get_contract_search(customer_id,search){
	if(nullCheck(customer_id)){
		var contract_search = search.load({
			id: 'customsearch_ofm_contractintegrastatusfo'
		});
		var filter_contract = search.createFilter({
		name:'internalid',
		join:'customer',
		operator: search.Operator.ANYOF,
		values:[customer_id]
		});
		contract_search.filters.push(filter_contract);			
		// declare array for results
		var searchResultCount = contract_search.runPaged().count;
		return searchResultCount;
	}
	else{
	    var length=0;
		return length;
	}
}