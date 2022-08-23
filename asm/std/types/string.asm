; creates a new string object in memory
; rcx -> string length          (qword)
; rdx -> char array pointer     (ptr)
; rax <- string object address  (ptr)
string_make:
  push  rdi
  mov   rdi, [brk_curr]
  push  rdi
  mov   qword [rdi + 0 * 8], 0    ; string object static `this`
  mov   qword [rdi + 1 * 8], 0    ; reference count
  mov   qword [rdi + 2 * 8], rcx  ; string length
  mov   qword [rdi + 3 * 8], rdx  ; char array pointer
  add   rdi, 4 * 8
  mov   [brk_curr], rdi
  pop   rax
  pop   rdi
  ret


; prints string to STDOUT
; rcx -> string     (ptr)
string_stdout:
  mov   rdx, [rcx + 2 * 8]  ; string length
  mov   rcx, [rcx + 3 * 8]  ; char array pointer
  call  sprint
  ret

; concatenates string stored in `rcx` and the string
; stored in `rdx`;
; rcx -> string1    (ptr)
; rdx -> string2    (ptr)
; rax <- new string (ptr)
string_concat:
  mov   rdi, [brk_curr]
  mov   rsi, [rcx + 3 * 8] ; char array pointer
  mov   rcx, [rcx + 2 * 8] ; first string length

  push  rcx       ; first string size
  push  rdi       ; new string address

  call  string_copy

  pop   rdi       ; new string address
  pop   rax       ; first string size
  add   rdi, rax
  mov   rcx, [rdx + 2 * 8] ; second string length
  mov   rsi, [rdx + 3 * 8] ; second array pointer

  add   rax, rcx  ; total new string size  
  push  rax

  call  string_copy

  xor   rdx, rdx
  mov   rbx, 8
  idiv  rbx
  mov   rcx, 8
  sub   rcx, rdx  ; additional offset (align)

  pop   rdx       ; total new string size

  mov   rdi, [brk_curr]
  mov   rsi, rdi

  add   rdi, rdx        ; add string offset
  add   rdi, rcx        ; add align

  mov   [brk_curr], rdi

  mov   rcx, rdx
  mov   rdx, rsi

  call  string_make

  ret
  
; copies a char array to a new address
; rsi -> source array  (ptr)
; rdi -> destination   (ptr)
; rcx -> string length (qword)
string_copy:
  push  rdi
  push  rsi
  push  rbx
  xor   rbx, rbx
.copy_loop:
  dec   rcx
  mov   bl, byte [rsi]
  mov   byte [rdi], bl
  add   rsi, 1
  add   rdi, 1
  cmp   rcx, 0
  jnz   .copy_loop

  pop   rbx
  pop   rsi
  pop   rdi
  ret

; repeats a string
; rcx -> source string  (ptr)
; rdx -> repeat count   (qword)
; rax <- new string     (ptr)
string_repeat:
  push  rsi
  push  rdi
  mov   rsi, rcx         ; source string ptr
  mov   rdi, [brk_curr]  ; new string char array destination ptr
  push  rdi
  xor   rbx, rbx            ; destination string length
  mov   rcx, [rsi + 2 * 8]  ; source string length
  mov   rsi, [rsi + 3 * 8]
  mov   rax, rdx            ; repeat count

.repeatLoop:
  dec   rax           ; missing repeats
  push  rax
  push  rbx
  push  rcx
  call  string_copy
  pop   rcx
  pop   rbx
  add   rdi, rcx      ; destination string char array ptr with offset
  add   rbx, rcx      ; destination string length
  pop   rax           ; missing repeats
  cmp   rax, 0
  jnz   .repeatLoop

  pop   rdi   ; destination string char array ptr
  push  rbx   ; destination string length

  mov   rax, rbx
  xor   rdx, rdx
  mov   rbx, 8
  idiv  rbx
  mov   rcx, 8
  sub   rcx, rdx     ; additional offset (align)

  pop   rbx          ; destination string length
  push  rdi

  add   rdi, rbx
  mov   [brk_curr], rdi

  mov   rcx, rbx     ; destination string length  
  pop   rdx          ; destination string char array ptr

  call  string_make

  pop   rdi
  pop   rsi
  ret