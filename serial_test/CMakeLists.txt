cmake_minimum_required(VERSION 3.27)
project(serial_test C)

set(CMAKE_C_STANDARD 99)

add_executable(serial_test main.c
        ui_interface.c
        ui_interface.h
        ui_types.h
        ui_default_ungroup1.c
        ui_default_ungroup2.c
)
