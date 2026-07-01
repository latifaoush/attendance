if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "C:/Users/toshiba/.gradle/caches/9.0.0/transforms/854fe9b071b2db9d59df287e1abd8071/transformed/hermes-android-0.82.0-debug/prefab/modules/hermesvm/libs/android.x86_64/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/toshiba/.gradle/caches/9.0.0/transforms/854fe9b071b2db9d59df287e1abd8071/transformed/hermes-android-0.82.0-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

