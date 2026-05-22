import axios from 'axios';

const base_url = 'https://total.ikonten.com/api';
const py_url = 'https://dreamland-anew-pang.ngrok-free.dev';
const CUSTOM_SECURITY = 'dwansoft123';

class Api {
  static headers() {
    return {
      'Custom-Security': CUSTOM_SECURITY,
      // 'Content-Type': 'application/json',
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

    let options = Object.assign(
      { method: verb },
      params ? { body: JSON.stringify(params) } : null,
    );

    options.headers = Api.headers();
    console.log(options.headers);

    return fetch(url, options)
      .then(resp => {

        let json = resp.json();

        if (resp.ok) {
          return json;
        }
        return json.then(err => {
          throw err;
        });
      })
      .then(json => {

        return json;
      })
      .catch(erorr => {
        console.log('error===> ' + erorr.name);
      });
  };

  static formDataPost = async (route, formData, verb) => {
    const host = base_url;
    const url = `${host}/${route}`;

    let options = {
      method: 'POST',
      body: formData,
      headers: {
        'Custom-Security': CUSTOM_SECURITY,
        // 'Content-Type': 'application/json',
      },
      timeout: 180000,
    };
    return fetch(url, options)
      .then(resp => {
        let json = resp.json();

        if (resp.ok) {
          return json;
        }
        return json.then(err => {
          throw err;
        });
      })
      .then(json => {
        return json;
      })
      .catch(error => {
        throw error;
      });
  };

  static axios = async (route, formData, config = {}) => {
    const host = base_url;
    const url = `${host}/${route}`;
    let options = {
      headers: {
        'Custom-Security': CUSTOM_SECURITY,
        'Content-Type': 'multipart/form-data',
      },
    };
    console.log(config);
    console.log(options);
    let configrations = Object.assign({}, config, options);
    console.log(configrations);
    // configrations = null;

    return axios.post(url, formData, configrations);
  };

  static registerFace = async (userid, imageUrl) => {
    const url = `${py_url}/daftar`;

    if (!userid) {
      console.warn('[Api] registerFace gagal: userid kosong!');
      throw new Error('User ID kosong');
    }

    const formData = new FormData();
    formData.append('file', {
      uri: imageUrl,
      type: 'image/jpeg',
      name: 'face.jpg',
    });

    formData.append('user_id', String(userid).trim());

    try {
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'ngrok-skip-browser-warning': 'true', // untuk melewati peringatan ngrok
        },
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      console.warn(
        '[Api] registerFace error:',
        error?.response?.data ?? error.message,
      );
      throw error;
    }
  };

  static verifyFace = async (userid, imageUri) => {
    const url = `${py_url}/test`;

    if (!userid) {
      console.warn('[Api] verifyFace ditolak: userid kosong.');
      throw new Error('User ID kosong.');
    }

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'face.jpg',
    });

    formData.append('user_id', String(userid).trim());

    try {
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'ngrok-skip-browser-warning': 'true',
        },
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      console.warn(
        '[Api] verifyFace error:',
        error?.response?.data ?? error.message,
      );
      throw error;
    }
  };

  static clockIn = async formData => {
    const url = `${base_url}/clockin`;

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Custom-Security': CUSTOM_SECURITY,
        },
        body: formData,
      });

      const text = await resp.text();
      console.log('[Api] clockIn raw response:', text.slice(0, 200));

      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Server return non-JSON: ${text.slice(0, 100)}`);
      }
    } catch (error) {
      console.warn('[Api] clockIn error:', error?.message ?? error);
      throw error;
    }
  };

  static clockOut = async formData => {
    const url = `${base_url}/clockout`;

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Custom-Security': CUSTOM_SECURITY,
        },
        body: formData,
      });

      const text = await resp.text();
      console.log('[Api] clockOut raw response:', text.slice(0, 200));

      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Server return non-JSON: ${text.slice(0, 100)}`);
      }
    } catch (error) {
      console.warn('[Api] clockOut error:', error?.message ?? error);
      throw error;
    }
  };

  static getLeaveList = async userid => {
    const url = `${base_url}/list`;

    const body = new URLSearchParams();
    body.append('UserId', String(userid));

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Custom-Security': CUSTOM_SECURITY,
        },
        body: body.toString(),
      });

      const json = await resp.json();
      return json;
    } catch (error) {
      console.warn('[Api] getLeaveList error:', error?.message ?? error);
      throw error;
    }
  };
}

export default Api;
