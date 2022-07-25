import KeycloakConnect from 'keycloak-connect';
import axios from 'axios';
import qs from 'qs';
// import KeycloakConnect = require('keycloak-connect');


namespace KeycloakClientAPI{
    
    export interface KeycloakUser {
        username : string;
        roles : string[];
        keycloak_id? : string;
        firstname? : string;
        lastname? : string;
        email? : string;
        email_verified? : Boolean;
    }

    
    /**
     * Objects from this class have clients attributes and functionalities. 
     * Clients can do stuff within its realm, and it can have roles attached to it.
     * In keycloak, clients can be thought of as applications with a defined authority level to alter the realm.
     */
    export class KeycloakClient {
    // PRIVATE:
        private m_keycloakConnection : KeycloakConnect.Keycloak;                // The connection to keycloak object
        private m_clientid : string;                                            // The client name inside the realm
        private m_clientsecret : string;                                        // The client secret 
        private m_keycloakConfig : KeycloakConnect.KeycloakConfig | any;        // The configuration of the keycloak connection
    

    // PUBLIC:
        public constructor(keycloak : KeycloakConnect.Keycloak, clientname : string, clientsecret : string){
            this.m_keycloakConnection = keycloak;
            this.m_clientid = clientname;
            this.m_clientsecret = clientsecret;
            this.m_keycloakConfig = keycloak.getConfig();
            /* Remove last '/' if there is any in the URL because we will be attaching the '/' in the requests */
            if(this.m_keycloakConfig.authServerUrl.charAt(this.m_keycloakConfig.authServerUrl.length - 1) == '/'){
                this.m_keycloakConfig.authServerUrl = this.m_keycloakConfig.authServerUrl.slice(0,-1);
            }
        }
    
    
        /**
         * Creates a new access token for the current client. The client must have "Direct Access Enabled" 
         * in keycloak.
         * @returns - A promise containing the access troken, or null if it can't create it.
         */
        public async createAccessToken() : Promise<string> {
            const result = await axios.post(
                    `${this.m_keycloakConfig.authServerUrl}/realms/${this.m_keycloakConfig.realm}/protocol/openid-connect/token`, 
                    qs.stringify({grant_type: 'client_credentials', client_id: this.m_clientid, client_secret: this.m_clientsecret}),
                    { headers: {'Content-Type': 'application/x-www-form-urlencoded'}}
                );
            return result.data.access_token as string;
        } 
    
    
        /**
         * Return a specific user data with the specific given username
         * @param username - The username registered for the user in keycloak
         * @returns - Keycloak user info which contain the keycloak user data. 
        */
        public async getUser (username: string): Promise<KeycloakUser> {
            const at = await this.createAccessToken(); // access token for the client to edit the realm
    
            /* Get the keycloak ID of the user */
            let reqRes = await axios({
                method:"get",
                url: `${this.m_keycloakConfig.authServerUrl}/admin/realms/${this.m_keycloakConfig.realm}/users?username=${username}`,
                headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + at }
            });
    
            const kcid : string = reqRes.data[0].id as string;
            const email_verified = reqRes.data[0].emailVerified;
            const enabled = reqRes.data[0].enabled;
    
            /* Get user roles */
            reqRes = await axios({
                method:"get",
                url: `${this.m_keycloakConfig.authServerUrl}/admin/realms/${this.m_keycloakConfig.realm}/users/${kcid}/role-mappings/realm`,
                headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + at }
            });
    
            /* Returning the data */
            const userData : KeycloakUser = { 
                keycloak_id: kcid, 
                enabled : enabled,
                username: username, 
                email_verified : email_verified,
                roles : reqRes.data.map((rl: any) => rl.name)
            } as KeycloakUser;
    
            return userData;   
        };
    
    
        /**
         * Get all users in the realm. If roles are given, then get the users with that specific role/s.
         *  Otherwise, return all users regardless of their role.
         * 
         * @param roles - An array of role names.
         * @returns - An array of Keycloak Users data
         */
        public async getUsers(roles? : string[]):Promise<KeycloakUser[]> {
            roles = roles? roles : []; // If roles is undefined, make it an empty list.

            const at : string  = await this.createAccessToken();

            /* Get users from keycloak by role (faster).*/
            const usersMap = new Map<string, KeycloakUser>(); // avoid redundancy of roles (iff user has multiple roles)
            for(const role of roles){
                /* Get the users by role */
                let reqRes = await axios({
                    method: "get", 
                    url: `${this.m_keycloakConfig.authServerUrl}/admin/realms/${this.m_keycloakConfig.realm}/roles/${role}/users`,
                    headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + at }
                });
    
                /* For all the users we got, add them to our map or update the map roles*/
                reqRes.data.forEach((user : any) => {
                    let userRoles = [role];
                    if(usersMap.has(user.id)){ // If we already got the user, then we just edit its role
                        const ukc : KeycloakUser = usersMap.get(user.id) as KeycloakUser;
                        userRoles = userRoles.concat(ukc.roles);
                    }
                    usersMap.set(user.id, {  // add/update the user (role is only updated if it exists) 
                        keycloak_id: user.id, 
                        username: user.username, 
                        email_verified : user.emailVerified,
                        roles : userRoles
                    } as KeycloakUser)
                });
            }
    
            /* Transform the map into an array.*/
            var usersData : KeycloakUser[] = [];
            usersMap.forEach( (data : KeycloakUser) => {
                usersData = usersData.concat(data);
            });
            return usersData;
        }
    
    
        /**
         * Returns all the roles in the realm.
         * @returns - An array of role id and name
         */
        public async getRoles() : Promise<{id:string, name:string}[]> {
            const at : string = await this.createAccessToken();
            let reqRes = await axios({
                method: "get", 
                url: `${this.m_keycloakConfig.authServerUrl}/admin/realms/${this.m_keycloakConfig.realm}/roles`,
                headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + at }
            });
            return reqRes.data.map((rl:any) => {return {id:rl.id, name:rl.name}});
        }
    

        /**
         * Update a given user with new roles. Simply, we delete the old roles then assign new roles to 
         * the user. 
         * @param username - Username for which the roles must be updated
         * @param roles - Array of new role/s that will be assigned to the user.
         * @returns - True if successfully updated the role
         */
        public async updateUserRoles(username: string, roles: string[]) : Promise<void> {
            /* Get current user data */
            const udata : KeycloakUser = await this.getUser(username);
    
            /* Client access token to edit the data */
            const at : string = await this.createAccessToken();
    
            /* Get role representations */
            let rolesData = await this.getRoles();
    
            /* Deleting all user's roles */
            await axios({
                method: "delete", 
                url: `${this.m_keycloakConfig.authServerUrl}/admin/realms/${this.m_keycloakConfig.realm}/users/${udata.keycloak_id}/role-mappings/realm`,
                data: rolesData,
                headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + at }
            });
    
            /* Filter the roles that are found in the given "roles" parameter */
            const filtered_roles = rolesData
                .filter((rl : any) => roles.indexOf(rl.name) > -1)
                .map((rl:any) => {return {id : rl.id, name:rl.name}});
    
            /* Assign the roles to the user */
            await axios({
                method: "post", 
                url: `${this.m_keycloakConfig.authServerUrl}/admin/realms/${this.m_keycloakConfig.realm}/users/${udata.keycloak_id}/role-mappings/realm`,
                data: filtered_roles,
                headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + at }
            });
        }
    
    
        /**
         * Create multiple users in keycloak given an array of KeycloakUser. 
         * Note:
         *  Passwords are generated randomly. 
         * 
         * Returns:
         *  A map containing the usernames and their relative passwords
         * 
         */
        public async createUsers(users: KeycloakUser[]) : Promise<Map<string, string>> {
            /* Creating client access token */
            const at : string = await this.createAccessToken();
    
            /* Creating user */
            var insertedUsers : Map<string, string> = new Map<string, string>();
            for(const user of users){
                if(insertedUsers.has(user.username)){
                    throw new Error("Username was already given");
                }
                const password : string = (Math.random() + 1).toString(36).substring(7);
                const userRepr = {
                    // id : user.keycloak_id,
                    email : user.email,
                    emailVerified : user.email_verified,
                    enabled : true,
                    realmRoles : user.roles,
                    username : user.username,
                    credentials : [{type:"password", value: password, temporary: false}]
                };
                
                /* Creates user in Keycloak */
                await axios({
                    method: "post", 
                    url: `${this.m_keycloakConfig.authServerUrl}/admin/realms/${this.m_keycloakConfig.realm}/users`,
                    data: userRepr,
                    headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + at }
                });
                await this.updateUserRoles(user.username, user.roles);
                insertedUsers.set(user.username, password);
            }
    
            return insertedUsers;
        }
    
    
        /**
         * Deletes a user from keycloak. This method throws an error if request is unsuccessfull
         * @param username - the username of the user. 
         */
        public async deleteUser(username: string): Promise<void> {
            /* Creating client access token */
            const at : string = await this.createAccessToken();
    
            /* Getting user keycloak id*/
            const userReq : KeycloakUser = await this.getUser (username);
    
            /* Deleting user from Keycloak */
            await axios({
                method: "delete", 
                url: `${this.m_keycloakConfig.authServerUrl}/admin/realms/${this.m_keycloakConfig.realm}/users/${userReq.keycloak_id}`,
                headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + at }
            });
        }
    
    };
}