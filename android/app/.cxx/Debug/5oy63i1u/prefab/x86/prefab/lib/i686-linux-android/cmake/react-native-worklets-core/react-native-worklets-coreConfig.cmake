if(NOT TARGET react-native-worklets-core::rnworklets)
add_library(react-native-worklets-core::rnworklets SHARED IMPORTED)
set_target_properties(react-native-worklets-core::rnworklets PROPERTIES
    IMPORTED_LOCATION "C:/max/amgtech/node_modules/react-native-worklets-core/android/build/intermediates/cxx/Debug/642a2u55/obj/x86/librnworklets.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/max/amgtech/node_modules/react-native-worklets-core/android/build/headers/rnworklets"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

