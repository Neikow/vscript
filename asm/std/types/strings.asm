; creates a new string object in memory
; rcx -> string length
; rdx -> char array pointer
; rax <- string object address
string_make:
  mov   rdi, [brk_curr]
  push  rdi
  mov   qword [rdi + 0 * 8], 0    ; string object static `this`
  mov   qword [rdi + 1 * 8], 0    ; reference count
  mov   qword [rdi + 2 * 8], rcx  ; string length
  mov   qword [rdi + 3 * 8], rsi  ; char array pointer
  add   rdi, 4 * 8
  mov   [brk_curr], rdi
  pop   rax
  ret

; concatenates string stored in `rcx` and the string
; stored in `rdx`;
; rcx -> string1
; rdx -> string2
string_concat:
  push  rbx
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

  mov   rax, rdi

  mov   qword [rdi + 0 * 8], 0      ; new string `this` pointer
  mov   qword [rdi + 1 * 8], 0      ; new string references
  mov   qword [rdi + 2 * 8], rdx    ; new string length
  mov   qword [rdi + 3 * 8], rsi    ; new string base pointer

  add   rdi, 4 * 8
  mov   [brk_curr], rdi

  pop   rbx
  ret
  
; copies a char array to a new address
; rsi -> source array address
; rdi -> destination address
; rcx -> string length
string_copy:
  push  rbx
  push  rdi

.copy_loop:
  dec   rcx
  mov   rbx, [rsi]
  mov   [rdi], rbx
  add   rsi, 8
  add   rdi, 8
  cmp   rcx, 0
  jnz   .copy_loop

  pop   rdi
  pop   rbx
  ret
