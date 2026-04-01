import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
//import store from '../services/Mob';
// change your baseUrl and Domain
//const base_url = 'http://45.77.246.138:8000';
//const base_url = 'http://amgtech.dwansoft.com/backend/web/index.php?r=api';
// const base_url = 'https://dev.amgvision.xyz/index.php?r=apitek2';
const base_url = 'https://total.ikonten.com/api';
//const base_url = "http://192.168.0.105:8000";

const CUSTOM_SECURITY = 'dwansoft123';

class Api {
  static headers() {
    return {
      'Custom-Security': CUSTOM_SECURITY,
      'Content-Type': 'application/json',
      // LoginID: store.login.loginID,
    };
  }

  static headersform() {
    return {
      'Custom-Security': CUSTOM_SECURITY,
      'Content-Type': 'multipart/form-data',
      // LoginID: store.login.loginID,
    };
  }

  static getBaseUrl() {
    return base_url;
  }

  static postAxios(route, formData, config) {
    return this.axios(route, formData, config);
  }

  static postForm(route, formData) {
    return this.formDataPost(route, formData, 'POST');
  }
  static get(route) {
    return this.func(route, null, 'GET');
  }

  static put(route, params) {
    return this.func(route, params, 'PUT');
  }

  static post(route, params) {
    return this.func(route, params, 'POST');
  }

  static delete(route, params) {
    return this.func(route, params, 'DELETE');
  }

  static func = async (route, params, verb) => {
    const host = base_url;
    const url = `${host}/${route}`;
    console.log('url--->', url);
    //const LoginID = store.login.loginID;
    //alert(store.login.loginID); //await Storage.getItem("profile");
    //console.log('LOCALDB => ' + nip);

    let options = Object.assign(
      { method: verb },
      params ? { body: JSON.stringify(params) } : null,
    );

    // console.log(JSON.stringify(params));
    options.headers = Api.headers();
    // options.headers['Authorization'] = LoginID;
    // console.log('URL===>>>>>', options);
    console.log(options.headers);
    //Authorization for login user/////
    // getting value from asyncStorage
    //const email = await AsyncStorage.getItem('email');
    //const pass = await AsyncStorage.getItem('password');
    // console.log('emaail si',email)
    // console.log('pass si',pass)
    // // using buffer
    // if (email !== null && pass !== null) {
    // const hash = new Buffer(`${email}:${pass}`).toString('base64');
    // options.headers['Authorization'] = `Basic ${hash}`;
    // }

    // options.auth= {
    //   username: 'usama@gmail.com',
    //   password: '123'
    // }
    return fetch(url, options)
      .then(resp => {
        //console.log('Api response is ------------->>>>>>', resp);

        let json = resp.json();

        if (resp.ok) {
          return json;
        }
        return json.then(err => {
          throw err;
        });
      })
      .then(json => {
        // console.log('Api response is ------------->>>>>>', json);

        return json;
      })
      .catch(erorr => {
        console.log('error===> ' + erorr.name);
      });
  };

  static formDataPost = async (route, formData, verb) => {
    const host = base_url;
    const url = `${host}/${route}`;
    //const nip = 'ridwan'; //await AsyncStorage.getItem("nip");
    // alert(nip);
    //formData.append('nip', nip);
    let options = {
      method: 'POST',
      body: formData,
      headers: {
        //LoginID: store.login.loginID,
        'Custom-Security': CUSTOM_SECURITY,
        'Content-Type': 'application/json',
        // 'Content-Type': 'multipart/form-data',
      },
      timeout: 180000,
    };
    // getting value from asyncStorage  ***
    //const email = await AsyncStorage.getItem('email');
    // const pass = await AsyncStorage.getItem('password');
    //console.log('login detail===>>>', email, pass);

    //Authorization for login user using buffer ***
    // if (email !== null && pass !== null) {
    //   const hash = new Buffer(`${email}:${pass}`).toString('base64');
    //  options.headers['Authorization'] = `Basic ${hash}`;
    // }
    //console.log(options);
    return fetch(url, options)
      .then(resp => {
        //console.log('Api response is ------------->>>>>>', resp);

        let json = resp.json();

        if (resp.ok) {
          return json;
        }
        return json.then(err => {
          throw err;
        });
      })
      .then(json => {
        //  console.log('Api response is ------------->>>>>>', json);
        return json;
      })
      .catch(error => {
        throw error;
        //  console.log('API ERROR===>>>', error);
      });
  };

  static axios = async (route, formData, config) => {
    const host = base_url;
    const url = `${host}/${route}`;
    //const nip = 'ridwan'; //await AsyncStorage.getItem("nip");
    let options = {
      headers: {
        'Custom-Security': CUSTOM_SECURITY,
        'Content-Type': 'multipart/form-data',
        //Authorization: nip,
        // LoginID: store.login.loginID,
      },
      //timeout: 100000, // default is `0` (no timeout)
    };
    console.log(config);
    console.log(options);
    let configrations = Object.assign(config, options);
    console.log(configrations);
    // getting value from asyncStorage  ***
    // const email = await AsyncStorage.getItem('email');
    // const pass = await AsyncStorage.getItem('password');
    //console.log('login detail===>>>', email, pass);

    //Authorization for login user using buffer ***
    // if (email !== null && pass !== null) {
    // const hash = new Buffer(`${email}:${pass}`).toString('base64');
    // options.headers['Authorization'] = `Basic ${hash}`;
    // }
    configrations = null;

    return axios.post(url, formData, configrations); //TypeError: Object.assign requires that input parameter not be null or undefined
    // .then((response)=>{
    //   console.log('SUCCESS!!',response);
    // })
    // .catch((error)=>{
    //   console.log('FAILURE!!',error);
    // });
  };
}

export default Api;
