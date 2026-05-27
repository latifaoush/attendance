import AsyncStorage from '@react-native-async-storage/async-storage';
import Api from '../utils/Api';
class Storage {
  static async setFcm(data) {
    console.warn('fcmData==>>', data);
    try {
      await AsyncStorage.setItem('fcmData', data);
      return true;
    } catch (error) {
      console.warn(error.message);
      return false;
    }
  }

  static async getFcm() {
    try {
      let item = (await AsyncStorage.getItem('fcmData')) || null;
      return item;
    } catch (error) {
      console.warn(error.message);
      return null;
    }
  }

  static async setProfile(data) {
    //  console.warn('data==>>', data);
    try {
      console.log('Menyimpan ke Storage:', data);
      let normalized = Array.isArray(data) ? [data[0]] : [data];
      await AsyncStorage.setItem('profile', JSON.stringify(normalized));
      return true;
    } catch (error) {
      console.warn(error.message);
      return false;
    }
  }

  static async getProfile() {
    let item = {};
    try {
      item = (await AsyncStorage.getItem('profile')) || null;
      const userProfile = JSON.parse(item);
      return userProfile;
    } catch (error) {
      console.warn(error.message);
      return null;
    }
  }

  static async setCredentials(username, password) {
    try {
      await AsyncStorage.setItem(
        'credentials',
        JSON.stringify({ username, password }),
      );
      return true;
    } catch (error) {
      console.warn(error.message);
      return false;
    }
  }

  static async getCredentials() {
    try {
      const item = await AsyncStorage.getItem('credentials');
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn(error.message);
      return null;
    }
  }

  static async setMetode(data) {
    //  console.warn('data==>>', data);
    try {
      await AsyncStorage.setItem('metode', JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn(error.message);
      return false;
    }
  }

  static async getMetode(key) {
    let item = {};
    try {
      item = (await AsyncStorage.getItem('metode')) || null;
      if (item == null) {
        let params = {
          filter: '',
          page: 1,
          limit: 10,
        };
        //console.log('load page =', params);
        let response = await Api.post('getmetode', params);
        //console.log('load data =', response);
        if (response.success === true) {
          await Storage.setMetode(response.data);
          item = await AsyncStorage.getItem('metode');
        } else {
          item = {};
        }
      }

      const rows = JSON.parse(item);
      //  console.log(rows);

      if (key != '') {
        for (let row of rows) {
          if (row.metodeid === key) {
            //  isfind = true;
            // Toast.show(product.name + ' Sudah Ditambahkan');
            // console.log('Update basket', basketItems);
            //  cartItem.qty += product.qty;
            return row;
          }
        }
        return rows;
      }
      return rows;
    } catch (error) {
      console.warn(error.message);
      return null;
    }
  }

  static async setBerita(data) {
    //  console.warn('data==>>', data);
    try {
      await AsyncStorage.setItem('berita', JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn(error.message);
      return false;
    }
  }

  static async getBerita(key) {
    let item = {};
    try {
      item = (await AsyncStorage.getItem('berita')) || null;
      if (item == null) {
        let params = {
          filter: '',
          page: 1,
          limit: 10,
        };
        //console.log('load page =', params);
        let response = await Api.post('getberita', params);
        //console.log('load data =', response);
        if (response.success === true) {
          await Storage.setBerita(response.data);
          item = await AsyncStorage.getItem('berita');
        } else {
          item = {};
        }
      }

      const rows = JSON.parse(item);
      //  console.log(rows);

      if (key != '') {
        for (let row of rows) {
          if (row.beritaid === key) {
            //  isfind = true;
            // Toast.show(product.name + ' Sudah Ditambahkan');
            // console.log('Update basket', basketItems);
            //  cartItem.qty += product.qty;
            return row;
          }
        }
        return rows;
      }
      return rows;
    } catch (error) {
      console.warn(error.message);
      return null;
    }
  }

  static async setArea(data) {
    //  console.warn('data==>>', data);
    try {
      await AsyncStorage.setItem('area', JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn(error.message);
      return false;
    }
  }
  static async getArea(key) {
    let item = {};
    try {
      //item = (await AsyncStorage.getItem('area')) || null;
      item = null;
      if (item == null) {
        let params = {
          filter: '',
          page: 1,
          limit: 100,
        };
        console.log('load page =', params);
        let response = await Api.post('getarea', params);
        // console.log('load data =', response);
        if (response.success === true) {
          await Storage.setArea(response.data);
          item = await AsyncStorage.getItem('area');
        } else {
          item = {};
        }
      }

      const rows = JSON.parse(item);
      //  console.log(rows);

      if (key != '') {
        for (let row of rows) {
          if (row.beritaid === key) {
            //  isfind = true;
            // Toast.show(product.name + ' Sudah Ditambahkan');
            // console.log('Update basket', basketItems);
            //  cartItem.qty += product.qty;
            return row;
          }
        }
        return rows;
      }
      return rows;
    } catch (error) {
      console.warn(error.message);
      return null;
    }
  }

  static async setRemarks(data) {
    //  console.warn('data==>>', data);
    try {
      await AsyncStorage.setItem('remarks', JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn(error.message);
      return false;
    }
  }
  static async getRemarks(key) {
    let item = {};
    try {
      //item = (await AsyncStorage.getItem('remark')) || null;
      item = null;
      if (item == null) {
        let params = {
          filter: '',
          page: 1,
          limit: 100,
        };
        console.log('load page =', params);
        let response = await Api.post('getremarks', params);
        // console.log('load data =', response);
        if (response.success === true) {
          await Storage.setRemarks(response.data);
          item = await AsyncStorage.getItem('remarks');
        } else {
          item = {};
        }
      }

      const rows = JSON.parse(item);
      //  console.log(rows);

      if (key != '') {
        for (let row of rows) {
          if (row.remarksid === key) {
            return row;
          }
        }
        return rows;
      }
      return rows;
    } catch (error) {
      console.warn(error.message);
      return null;
    }
  }

  static clearProfile() {
    console.warn('data==>>clear');
    try {
      AsyncStorage.clear();
      return true;
    } catch (error) {
      // Error retrieving data
      console.warn(error.message);
      return false;
    }
  }

  static async updateCheckIn(checkInTime) {
    try {
      const item = await AsyncStorage.getItem('profile');
      if (!item) return false;

      const profile = JSON.parse(item);

      if (Array.isArray(profile) && profile.length > 0) {
        profile[0].check_in = checkInTime;
        profile[0].check_out = '';
      } else if (profile) {
        profile.check_in = checkInTime;
        profile.check_out = '';
      }

      await AsyncStorage.setItem('profile', JSON.stringify(profile));
      return true;
    } catch (error) {
      console.warn(error.message);
      return false;
    }
  }

  static async updateCheckOut(checkOutTime) {
    try {
      const item = await AsyncStorage.getItem('profile');
      if (!item) return false;

      const profile = JSON.parse(item);

      if (Array.isArray(profile) && profile.length > 0) {
        profile[0].check_out = checkOutTime;
        profile[0].last_check_out = checkOutTime;
      } else if (profile) {
        profile.check_out = checkOutTime;
        profile.last_check_out = checkOutTime;
      }

      await AsyncStorage.setItem('profile', JSON.stringify(profile));
      return true;
    } catch (error) {
      console.warn(error.message);
      return false;
    }
  }
}

export default Storage;
