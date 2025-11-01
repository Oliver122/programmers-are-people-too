cmake_minimum_required(VERSION 4.0)

# Create foobar executable
add_executable(foobar)

target_include_directories(
  foobar
  PRIVATE ${CMAKE_CURRENT_LIST_DIR}/..
)

# Collect backend source files
file(
  GLOB_RECURSE
  foobar_backend_files
  "*.cpp"
)

target_sources(
  foobar
  PRIVATE
  ${foobar_backend_files}
)

# Link against object library
target_link_libraries(
  foobar
  PRIVATE
  ${CMAKE_THREAD_LIBS_INIT}
)
