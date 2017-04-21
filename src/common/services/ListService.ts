import { Text }                                                 	from '@microsoft/sp-core-library';
import { SPHttpClient, ISPHttpClientOptions, SPHttpClientResponse } from '@microsoft/sp-http';

export class ListService {

	/***************************************************************************
     * The spHttpClient object used for performing REST calls to SharePoint
     ***************************************************************************/
    private spHttpClient: SPHttpClient;


	/**************************************************************************************************
     * Constructor
     * @param httpClient : The spHttpClient required to perform REST calls against SharePoint
     **************************************************************************************************/
    constructor(spHttpClient: SPHttpClient) {
        this.spHttpClient = spHttpClient;
    }


	/**************************************************************************************************
	 * Performs a CAML query against the specified list and returns the resulting items
	 * @param webUrl : The url of the web which contains the specified list
	 * @param listTitle : The title of the list which contains the elements to query
	 * @param camlQuery : The CAML query to perform on the specified list
	 **************************************************************************************************/
	public getListItemsByQuery(webUrl: string, listTitle: string, camlQuery: string): Promise<any> {
		return new Promise<any>((resolve,reject) => {
			let endpoint = Text.format("{0}/_api/web/lists/GetByTitle('{1}')/GetItems?$expand=FieldValuesAsText,FieldValuesAsHtml", webUrl, listTitle);
			let data:any = { 
				query : { 
					__metadata: { type: "SP.CamlQuery" }, 
					ViewXml: camlQuery
				}
			};
			let options: ISPHttpClientOptions = { headers: { 'odata-version': '3.0' }, body: JSON.stringify(data) };

			// Tests the web URL against 404 errors before executing the query, to avoid a bug that occurs with SPHttpClient.post when trying to post
			// https://github.com/SharePoint/sp-dev-docs/issues/553
			this.spHttpClient.get(webUrl, SPHttpClient.configurations.v1, { method: 'HEAD' })
				.then((headResponse: SPHttpClientResponse) => {
					if(headResponse.status != 404) {

						// If there is no 404, proceeds with the CAML query
						this.spHttpClient.post(endpoint, SPHttpClient.configurations.v1, options)
							.then((postResponse: SPHttpClientResponse) => {
								if(postResponse.ok) {
									resolve(postResponse.json());
								}
								else {
									reject(postResponse);
								}
							})
							.catch((error) => { reject(error); }); 
					}
					else {
						reject(headResponse);
					}
				})
				.catch((error) => { reject(error); });
        });
	}


	/**************************************************************************************************
	 * Returns a sorted array of all available list titles for the specified web
	 * @param webUrl : The web URL from which the list titles must be taken from
	 **************************************************************************************************/
	public getListTitlesFromWeb(webUrl: string): Promise<string[]> {
		return new Promise<string[]>((resolve,reject) => {
			let endpoint = Text.format("{0}/_api/web/lists?$select=Title&$filter=(IsPrivate eq false) and (IsCatalog eq false) and (Hidden eq false)", webUrl);
			this.spHttpClient.get(endpoint, SPHttpClient.configurations.v1).then((response: SPHttpClientResponse) => {
				if(response.ok) {
					response.json().then((data: any) => {
						let listTitles:string[] = data.value.map((list) => { return list.Title; });
						resolve(listTitles.sort());
					})
					.catch((error) => { reject(error); });
				}
				else {
					reject(response);
				}
			})
			.catch((error) => { reject(error); }); 
        });
	}


	/**************************************************************************************************
	 * Returns a sorted array of all available list titles for the specified web
	 * @param webUrl : The web URL from which the specified list is located
	 * @param listTitle : The title of the list from which to load the fields
	 * @param selectProperties : Optionnaly, the select properties to narrow down the query scope
	 **************************************************************************************************/
	public getListFields(webUrl: string, listTitle: string, selectProperties?: string[], orderBy?: string): Promise<any> {
		return new Promise<any>((resolve,reject) => {
			let selectProps = selectProperties ? selectProperties.join(',') : '';
			let order = orderBy ? orderBy : 'InternalName';
			let endpoint = Text.format("{0}/_api/web/lists/GetByTitle('{1}')/Fields?$select={2}&$orderby={3}", webUrl, listTitle, selectProps, order);
			this.spHttpClient.get(endpoint, SPHttpClient.configurations.v1).then((response: SPHttpClientResponse) => {
				if(response.ok) {
					resolve(response.json());
				}
				else {
					reject(response);
				}
			})
			.catch((error) => { reject(error); }); 
        });
	}

}