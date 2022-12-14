; creates a new array object in memory
; rcx -> array size             (qword)
; rdx -> array base pointer     (ptr)
; rax <- array object address   (ptr)
array_make:
  push  rdi
  mov   rdi, [brk_curr]
  push  rdi
  mov   qword [rdi + 0 * 8], 0    ; array object static `this`
  mov   qword [rdi + 1 * 8], 0    ; reference count
  mov   qword [rdi + 2 * 8], rcx  ; max array size
  mov   qword [rdi + 3 * 8], 0    ; curr array size
  mov   qword [rdi + 4 * 8], rdx  ; array base pointer
  add   rdi, 5 * 8
  mov   [brk_curr], rdi
  pop   rax
  pop   rdi
  ret

; prints an array to STDOUT
; rcx -> array        (ptr)
; rdx -> function     (ptr)
array_stdout:
  push  rsi
  push  rbx

  mov   rax, rcx
  mov   rbx, [rax + 3 * 8]  ; array size
  mov   rsi, [rax + 4 * 8]  ; array base
  mov   r8, rdx             ; print function

  mov   byte [output_buffer], 0x5B ; '['
  mov   rcx, output_buffer
  mov   rdx, 1
  call  sprint

.print_loop:
  dec   rbx
  mov   qword rcx, [rsi]

  cmp   rcx, 0          ; compares to null pointer
  jnz   .nonNull

  mov   rcx, str_null
  mov   rdx, str_null_len
  call  sprint

  jmp   .afterNullCheck
    
.nonNull:
  call  r8

.afterNullCheck:
  add   rsi, 8

  cmp   rbx, 0
  je    .afterLoop

  mov   byte [output_buffer], 0x2C       ; ','
  mov   byte [output_buffer + 1], 0x20   ; ' '
  mov   rcx, output_buffer
  mov   rdx, 2
  call  sprint

  cmp   rbx, 0
  jnz   .print_loop

.afterLoop:
  mov   byte [output_buffer], 0x5D ; ']'
  mov   rcx, output_buffer
  mov   rdx, 1
  call  sprint

  pop   rbx
  pop   rsi
  ret


; pushes a value into the array
; rcx -> array            (ptr)
; rdx -> value            (ptr)
; rax <- new array length (u64)
array_push:
  push  rdi
  mov   rax, [rcx + 3 * 8]    ; curr size
  cmp   rax, [rcx + 2 * 8]    ; compare to max size
  je    err_out_of_bounds

  mov   rdi, [rcx + 4 * 8]    ; values array
  mov   [rdi + rax * 8], rdx  ; set new value
  inc   rax
  mov   qword [rcx + 3 * 8], rax
  
  mov   rcx, rax
  call  u64_make

  pop   rdi
  ret


; pops a value from the top of the array
; rcx -> array            (ptr)
; rax <- popped object    (ptr)
array_pop:
  push  rdi
  mov   rax, [rcx + 3 * 8]    ; curr size
  dec   rax
  cmp   rax, -1
  je    err_out_of_bounds

  mov   qword [rcx + 3 * 8], rax
  mov   rdi, [rcx + 4 * 8]

  mov   rax, [rdi + rax * 8]

  pop   rdi
  ret

; access the element at index
; rcx -> array            (ptr)
; rdx -> index            (u64)
; rax <- value at index   (ptr)
array_access:
  push  rbx
  mov   rbx, [rdx + 2 * 8]
  cmp   rbx, -1
  je    err_out_of_bounds

  cmp   rbx, [rcx + 3 * 8]
  jge   err_out_of_bounds

  push  rsi
  mov   rsi, [rcx + 4 * 8]
  mov   rax, [rsi + rbx * 8] 

  pop   rsi
  pop   rbx
  ret

; updates the element at index
; rcx -> array            (ptr)
; rdx -> index            (u64)
; r8  -> value            (ptr)
; rax <- value            (ptr)
array_update:  
  mov   rdx, [rdx + 2 * 8]
  cmp   rdx, -1
  je    err_out_of_bounds

  cmp   rdx, [rcx + 3 * 8]
  jge   err_out_of_bounds

  push  rsi
  mov   rsi, [rcx + 4 * 8]
  mov   [rsi + rdx * 8], r8
  mov   rax, r8

  pop   rsi
  ret

; copies an array to a new address
; rsi -> source array   (ptr)
; rdi -> destination    (ptr)
; rcx -> array size     (qword)
array_copy:
  push  rdi
  push  rsi
  push  rbx
.copy_loop:
  dec   rcx
  mov   rbx, qword [rsi]
  mov   qword [rdi], rbx
  add   rsi, 8
  add   rdi, 8
  cmp   rcx, 0
  jnz   .copy_loop

  pop   rbx
  pop   rsi
  pop   rdi
  ret

; creates a new array by repeating another array
; rcx -> array              (ptr)
; rdx -> count              (u64)
; rax <- new array address  (ptr)
array_repeat:
  push  rsi
  push  rdi
  mov   rsi, rcx         ; source array ptr
  mov   rdi, [brk_curr]  ; new array destination ptr
  push  rdi
  xor   rbx, rbx            ; destination array length
  mov   rcx, [rsi + 3 * 8]  ; source array length
  mov   rsi, [rsi + 4 * 8]
  mov   rax, [rdx + 2 * 8]  ; repeat count

.repeatLoop:
  dec   rax           ; missing repeats
  push  rax
  push  rbx
  push  rcx
  call  array_copy
  pop   rcx
  pop   rbx
  mov   rax, rcx
  mov   rdx, 8
  mul   rdx
  add   rdi, rax      ; destination array ptr with offset
  add   rbx, rcx      ; destination array length
  pop   rax           ; missing repeats
  cmp   rax, 0
  jnz   .repeatLoop

  pop   rdi   ; destination array ptr
  push  rdi

  mov   rax, 8
  mul   rbx
  add   rdi, rax
  mov   qword [brk_curr], rdi

  mov   rcx, rbx     ; destination array length
  pop   rdx          ; destination array ptr
  push  rcx
  call  array_make
  pop   rcx
  mov   [rax + 3 * 8], rcx

  pop   rdi
  pop   rsi
  ret


