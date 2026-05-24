import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Search,
  X,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronDown,
} from 'lucide-react-native';
import Api from '../utils/Api';
import axios from 'axios';
import Storage from '../utils/Storage';

const mapApiToWorkOrder = apiItem => {
  let status = 'Open';

  if (apiItem.statuswovw) {
    const s = apiItem.statuswovw.trim();
    if (s === 'Closed' || s === 'Close' || s === 'COMPLETED') {
      status = 'Closed';
    } else if (s === 'In Progress' || s === 'Progress' || s === 'ONGOING') {
      status = 'Progress';
    } else if (s === 'Open' || s === 'OPEN' || s === 'NEW') {
      status = 'Open';
    } else if (s === 'Reschedule' || s === 'RESCHEDULE') {
      status = 'Reschedule';
    }
  }

  return {
    id: apiItem.workerorderid || '-',
    no: apiItem.workerorderno || '-',
    customer: apiItem.customername || 'Unknown Customer',
    address: apiItem.address || 'No Address',
    date: apiItem.workerorderdate || '-',
    status: apiItem.statuswovw || status,
    remarks: apiItem.remarks || '-',
    note: apiItem.complain || '-',
    phone: apiItem.phone || '-',
    area: apiItem.areaname || '-',
    subarea: apiItem.subareaname || '-',
    workordertype: apiItem.workerordertypevw || '-',
    statusWo: apiItem.statuswo || status,
    areaid: apiItem.areaid || '',
    workerordertypeid: apiItem.workerordertypeid || '',
  };
};

const getStatusConfig = status => {
  switch (status) {
    case 'Open':
      return {
        color: '#ef4444',
        bgColor: '#fee2e2',
        icon: AlertCircle,
        label: 'Open',
      };
    case 'Progress':
      return {
        color: '#f59e0b',
        bgColor: '#fef3c7',
        icon: Clock,
        label: 'In Progress',
      };
    case 'Closed':
      return {
        color: '#10b981',
        bgColor: '#d1fae5',
        icon: CheckCircle2,
        label: 'Closed',
      };
    case 'Re-Schedule':
      return {
        color: '#0bcef5ff',
        bgColor: '#c7f5feff',
        icon: Clock,
        label: 'Re-Schedule',
      };
    default:
      return {
        color: '#6b7280',
        bgColor: '#f3f4f6',
        icon: AlertCircle,
        label: status,
      };
  }
};

function FilterTab({ status, isActive, count, onPress }) {
  const containerClass = isActive
    ? 'flex-1 mx-1 py-2.5 rounded-xl bg-gray-600 shadow-md'
    : 'flex-1 mx-1 py-2.5 rounded-xl bg-white border border-gray-200';

  const statusTextClass = isActive
    ? 'text-center text-xs font-bold text-white'
    : 'text-center text-xs font-bold text-gray-600';

  const countTextClass = isActive
    ? 'text-center text-xs font-semibold mt-0.5 text-gray-200'
    : 'text-center text-xs font-semibold mt-0.5 text-gray-400';

  return (
    <TouchableOpacity onPress={onPress} className={containerClass}>
      <Text className={statusTextClass}>{status}</Text>
      <Text className={countTextClass}>{count}</Text>
    </TouchableOpacity>
  );
}

function Dropdown({ label, value, options, onSelect, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-gray-700 mb-2">{label}</Text>

      {/* Dropdown Button */}
      <TouchableOpacity
        className="border border-gray-300 rounded-xl p-4 bg-white"
        onPress={() => setIsOpen(!isOpen)}
      >
        <View className="flex-row justify-between items-center">
          <Text
            className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}
          >
            {displayText}
          </Text>
          <ChevronDown
            size={20}
            color="#6b7280"
            style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
          />
        </View>
      </TouchableOpacity>

      {/* Dropdown Options */}
      {isOpen && (
        <View className="mt-2 border border-gray-200 rounded-xl bg-white shadow-lg max-h-60">
          <ScrollView>
            {options.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                className={`p-4 ${
                  index !== options.length - 1 ? 'border-b border-gray-100' : ''
                } ${value === option.value ? 'bg-gray-50' : ''}`}
                onPress={() => {
                  onSelect(option.value);
                  setIsOpen(false);
                }}
              >
                <Text
                  className={`${
                    value === option.value
                      ? 'text-gray-600 font-bold'
                      : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function WorkOrderScreen({ navigation }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [pressedId, setPressedId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const [modalVisible, setModalVisible] = useState(false);
  const [filterStatusModal, setFilterStatusModal] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [dataArea, setDataArea] = useState([]);

  const statusOptions = [
    { label: 'ALL', value: '' },
    { label: 'Open', value: '0' },
    { label: 'On Progress', value: '1' },
    { label: 'Closed', value: '2' },
    { label: 'Reschedule', value: '4' },
  ];

  const workOrderTypes = [
    { label: 'ALL', value: '' },
    { label: 'Normal Service', value: '0' },
    { label: 'Lock Signal', value: '1' },
    { label: 'New Installation', value: '2' },
    { label: 'Free to Free', value: '3' },
    { label: 'Open Signal', value: '4' },
    { label: 'Pararel TV', value: '5' },
  ];

  useEffect(() => {
    fetchArea();
    setWorkOrders([]);
    setPage(1);
    getWorkOrder(1);
  }, [getWorkOrder]);

  const fetchArea = async () => {
    try {
      const response = await Storage.getArea('');
      // console.log('Area Data:', response);
      if (response && response.length > 0) {
        setDataArea(response);
      }
    } catch (error) {
      console.log('Error fetching area:', error);
    }
  };

  const areaOptions = useMemo(() => {
    const serverHasAll = dataArea.some(a => {
      const name = (a.areaname || a.name || '').toString().trim().toLowerCase();
      const id = (a.areaid || a.id || '').toString().trim();
      return name === 'all' || id === '';
    });

    const options = serverHasAll ? [] : [{ label: 'ALL', value: '' }];

    dataArea.forEach(area => {
      options.push({
        label: area.areaname || area.name || 'Unknown',
        value: area.areaid ?? area.id ?? '',
      });
    });

    const seen = new Set();
    return options.filter(opt => {
      if (seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
  }, [dataArea]);

  const onRefresh = async () => {
    setRefreshing(true);
    setWorkOrders([]);
    setPage(1);
    await getWorkOrder(1);
    setRefreshing(false);
  };

  const filteredData = useMemo(() => {
    return workOrders.filter(item => {
      const matchesStatus =
        filterStatus === 'All' || item.status === filterStatus;
      const matchesSearch =
        item.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.no.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [workOrders, searchQuery, filterStatus]);

  const hasMore = workOrders.length < totalCount;

  const statusCounts = useMemo(() => {
    return {
      All: workOrders.length,
      Open: workOrders.filter(item => item.status === 'Open').length,
      Progress: workOrders.filter(item => item.status === 'Progress').length,
      Close: workOrders.filter(item => item.status === 'Closed').length,
      Reschedule: workOrders.filter(item => item.status === 'Reschedule')
        .length,
    };
  }, [workOrders]);

  const handlePressIn = id => {
    setPressedId(id);
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setPressedId(null);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const handlePressStatus = async item => {
    if (item.status === 'Closed') {
      return;
    }

    if (item.status === 'Open') {
      Alert.alert(
        'Ubah Status',
        'Yakin ingin mengubah status menjadi In Progress?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Ya, Lanjutkan',
            onPress: async () => {
              try {
                const profile = await Storage.getProfile();
                const formData = new FormData();
                formData.append('loginID', profile[0]?.userid);
                formData.append('workerorderid', item.id);
                formData.append('statuswo', '0');

                const response = await axios.post(
                  Api.getBaseUrl() + '/submitworkorder',
                  formData,
                  {
                    headers: Api.headersform(),
                  },
                );
                console.log('Response status progress:', response);

                if (response.data.success) {
                  Alert.alert(
                    'Berhasil!',
                    response.data.pesan ||
                      'Status berhasil diubah ke In Progress',
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          onRefresh();
                          navigation.navigate('WorkOrderDetail', {
                            id: item.id,
                          });
                        },
                      },
                    ],
                  );
                } else {
                  Alert.alert(
                    'Gagal',
                    response.data.pesan || 'Tidak dapat mengubah status',
                  );
                }
              } catch (error) {
                console.log(
                  'Error update status:',
                  error.response?.data || error,
                );
                Alert.alert(
                  'Error',
                  'Gagal terhubung ke server. Coba lagi nanti.',
                );
              }
            },
          },
        ],
        { cancelable: true },
      );
    } else {
      navigation.navigate('WorkOrderDetail', { id: item.id });
    }
  };

  const handleFilterChange = status => {
    setFilterStatus(status);
  };

  const applyFilters = () => {
    setModalVisible(false);
    setWorkOrders([]);
    setPage(1);
    getWorkOrder(1);
  };

  const resetFilters = () => {
    setFilterStatusModal('');
    setFilterType('');
    setFilterArea('');
  };

  const getWorkOrder = useCallback(
    async (pageNumber = 1) => {
      try {
        setLoading(pageNumber === 1);
        setLoadingMore(pageNumber !== 1);

        const profile = await Storage.getProfile();

        let apiFilterStatus = '';
        if (filterStatus === 'Open') apiFilterStatus = '0';
        else if (filterStatus === 'Progress') apiFilterStatus = '1';
        else if (filterStatus === 'Close') apiFilterStatus = '2';
        else if (filterStatus === 'Reschedule') apiFilterStatus = '4';

        const finalFilterStatus = filterStatusModal || apiFilterStatus;

        const params = {
          loginID: profile[0]?.userid,
          page: pageNumber,
          limit: 5,
          filter: searchQuery,
          filterstatus: finalFilterStatus,
          filtertype: filterType,
          filterarea: filterArea,
        };

        // console.log('Request params:', params);

        const response = await Api.post('getworkorder', params);
        console.log('Response WorkOrder:', response);

        if (response?.data) {
          const mappedData = response.data.map(mapApiToWorkOrder);

          if (response?.totalCount) {
            setTotalCount(response.totalCount);
          }

          if (pageNumber === 1) {
            setWorkOrders(mappedData);
          } else {
            setWorkOrders(prev => [...prev, ...mappedData]);
          }
          setPage(pageNumber);
        }
      } catch (error) {
        console.log('Error saat ambil data WorkOrder:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filterStatus, filterStatusModal, filterType, filterArea, searchQuery],
  );

  const renderItem = ({ item }) => {
    const isPressed = pressedId === item.id;
    const statusConfig = getStatusConfig(item.status);
    const StatusIcon = statusConfig.icon;

    return (
      <Animated.View
        style={{ transform: [{ scale: isPressed ? scaleAnim : 1 }] }}
        className="mb-3"
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPressIn={() => handlePressIn(item.id)}
          onPressOut={handlePressOut}
          className="bg-white shadow-md rounded-2xl p-4 border border-gray-100"
        >
          {/* Header Row */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-row items-center">
              <View className="w-fit h-10 bg-gray-100 rounded-xl items-center justify-center mr-3 px-2">
                <Text className="text-gray-600 font-bold text-sm">
                  {item.no}
                </Text>
              </View>
              <View className="w-[250px]">
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="text-gray-900 font-bold text-base text-ellipsis overflow-hidden shrink"
                >
                  {item.customer}
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  {item.date}
                </Text>
              </View>
            </View>
          </View>

          {/* Phone Number  */}
          <View className="flex-row items-center mb-1 bg-gray-50 px-2 py-1 rounded-lg">
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="text-gray-600 text-sm flex-1"
            >
              📞 {item.phone}
            </Text>
          </View>

          {/* Area  */}
          <View className="flex-row items-center mb-1 bg-gray-50 px-2 py-1 rounded-lg">
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="text-gray-600 text-sm flex-1"
            >
              🌐 {item.area} - {item.subarea}
            </Text>
          </View>

          {/* Address */}
          <View className="flex-row items-center mb-3 bg-gray-50 px-2 py-1 rounded-lg">
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="text-gray-600 text-sm flex-1"
            >
              📍 {item.address}
            </Text>
          </View>

          <View className="border-b border-b-gray-300 w-full my-1" />

          {/*  Remarks  */}
          <View className="flex-row items-center mb-1 bg-gray-50 px-2 py-1 rounded-lg">
            <Text
              numberOfLines={2}
              ellipsizeMode="tail"
              className="text-gray-600 text-sm flex-1"
            >
              Remarks: {item.remarks}
            </Text>
          </View>

          {/*  Note  */}
          <View className="flex-row items-center mb-3 bg-gray-50 px-2 py-1 rounded-lg">
            <Text
              numberOfLines={2}
              ellipsizeMode="tail"
              className="text-gray-600 text-sm flex-1"
            >
              Note: {item.note}
            </Text>
          </View>

          {/* Footer Row */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <Text className="text-gray-600 text-sm font-bold ">
                {item.workordertype}
              </Text>
            </View>
            <TouchableOpacity
              disabled={statusConfig.label === 'Closed'}
              onPress={() => handlePressStatus(item)}
              activeOpacity={statusConfig.label === 'Closed' ? 1 : 0.7}
              className="flex-row items-center px-3 py-2 rounded-xl"
              style={{
                backgroundColor: statusConfig.bgColor,
                opacity: statusConfig.label === 'Closed' ? 0.5 : 1,
              }}
            >
              <StatusIcon
                size={16}
                color={statusConfig.color}
                strokeWidth={2.5}
              />
              <Text
                className="ml-1.5 text-xs font-bold"
                style={{ color: statusConfig.color }}
              >
                {statusConfig.label}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#4f46e5" />
        <Text className="text-center text-gray-400 text-sm mt-2">
          Loading more...
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Advanced Filter Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Filter Work Order
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="black" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Filter Status */}
              <Dropdown
                label="Status"
                value={filterStatusModal}
                options={statusOptions}
                onSelect={setFilterStatusModal}
                placeholder="Select Status"
              />

              {/* Filter Type */}
              <Dropdown
                label="Type"
                value={filterType}
                options={workOrderTypes}
                onSelect={setFilterType}
                placeholder="Select Type"
              />

              {/* Filter Area */}
              <Dropdown
                label="Area"
                value={filterArea}
                options={areaOptions}
                onSelect={setFilterArea}
                placeholder="Select Area"
              />
            </ScrollView>

            {/* Action Buttons */}
            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 bg-gray-200 py-3 rounded-xl"
                onPress={resetFilters}
              >
                <Text className="text-center font-bold text-gray-700">
                  Reset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-gray-600 py-3 rounded-xl"
                onPress={applyFilters}
              >
                <Text className="text-center font-bold text-white">
                  Apply Filter
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header with Stats */}
      <View className="bg-gray-600 pt-12 pb-8 px-5 rounded-b-[32px] shadow-xl">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-white text-2xl font-bold tracking-wide">
              Work Orders
            </Text>
            <Text className="text-gray-200 mt-1 text-sm">
              {totalCount} total tasks
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar with Filter Button */}
      <View className="px-5 -mt-4 mb-4">
        <View className="flex-row gap-2">
          <View className="flex-1 flex-row items-center bg-white rounded-2xl shadow-lg px-4 py-3">
            <Search size={20} color="#6b7280" strokeWidth={2.5} />
            <TextInput
              placeholder="Search by ID or Customer..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => {
                setWorkOrders([]);
                setPage(1);
                getWorkOrder(1);
              }}
              className="flex-1 ml-3 text-[15px] text-gray-800"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color="#9ca3af" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            className="bg-white rounded-2xl shadow-lg px-4 py-3 justify-center items-center"
            onPress={() => setModalVisible(true)}
          >
            <Filter size={20} color="#4f46e5" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      {/* <View className="px-5 mb-4">
        <View className="flex-row justify-between">
          <FilterTab
            status="All"
            isActive={filterStatus === 'All'}
            count={statusCounts.All}
            onPress={() => handleFilterChange('All')}
          />
          <FilterTab
            status="Open"
            isActive={filterStatus === 'Open'}
            count={statusCounts.Open}
            onPress={() => handleFilterChange('Open')}
          />
          <FilterTab
            status="Progress"
            isActive={filterStatus === 'Progress'}
            count={statusCounts.Progress}
            onPress={() => handleFilterChange('Progress')}
          />
          <FilterTab
            status="Close"
            isActive={filterStatus === 'Close'}
            count={statusCounts.Close}
            onPress={() => handleFilterChange('Close')}
          />
        </View>
      </View> */}

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" className="mt-10" />
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 70 }}
          onEndReached={() => {
            if (!loadingMore && hasMore) {
              getWorkOrder(page + 1);
            }
          }}
          onEndReachedThreshold={0.2}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Filter size={32} color="#9ca3af" strokeWidth={2} />
              </View>
              <Text className="text-gray-400 text-base font-semibold">
                No work orders found
              </Text>
              <Text className="text-gray-400 text-sm mt-1">
                Try adjusting your filters
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
    </View>
  );
}
