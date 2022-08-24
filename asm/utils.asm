SYS_WRITE       equ 1
SYS_EXIT        equ 60
SYS_NANOSLEEP   equ 35
STDIN           equ 0
STDOUT          equ 1
STDERR          equ 2

; Prints an integer to STDOUT
; -> rcx : integer
iprint:
  push  rcx
  push  rsi
  push  rdi
  push  rbx
  
  mov   rax, rcx    ; u64
  xor   rcx, rcx    ; digits count

.divideLoop:
  inc   rcx         
  xor   rdx, rdx
  mov   rsi, 10
  idiv  rsi
  add   rdx, 48
  push  rdx
  cmp   rax, 0
  jnz   .divideLoop
  
  mov   rdx, rcx
  xor   rbx, rbx

  ; `ESC`[33;1m
  mov   byte [output_buffer + 0], 0x1B ; 'ESC'
  mov   byte [output_buffer + 1], 0x5B ; '['
  mov   byte [output_buffer + 2], 0x39 ; '9'
  mov   byte [output_buffer + 3], 0x33 ; '3'
  mov   byte [output_buffer + 4], 0x6D ; 'm'
  add   rbx, 5
  add   rdx, 5

.printLoop:
  dec   rcx
  pop   rax
  mov   byte [output_buffer + rbx], al
  add   rbx, 1
  cmp   rcx, 0
  jnz   .printLoop

  ; `ESC`[0m
  mov   byte [output_buffer + rbx + 0], 0x1B ; 'ESC'
  mov   byte [output_buffer + rbx + 1], 0x5B ; '['
  mov   byte [output_buffer + rbx + 2], 0x30 ; '0'
  mov   byte [output_buffer + rbx + 3], 0x6D ; 'm'
  add   rdx, 4

  mov   rcx, output_buffer
  call  sprint

  pop   rbx
  pop   rdi
  pop   rsi
  pop   rcx

  ret

; Prints a char array to STDOUT
; -> rcx : char array base pointer
; -> rdx : string length
sprint:
  push  rdi
  push  rsi
  mov   rsi, rcx
	mov   rdi, STDOUT
  mov   rax, SYS_WRITE
  syscall
  pop   rsi
  pop   rdi
  ret

; Prints a boolean value to STDOUT
; -> rcx : 0 or 1
bprint:
  cmp   rcx, 0
  je    .printFalse
.printTrue:
  mov   rcx, str_true
  mov   rdx, [str_true_len]
  call  sprint
  jmp   .endPrint
.printFalse:
  mov   rcx, str_false
  mov   rdx, [str_false_len]
  call  sprint

.endPrint:
  ret

; Prints a linefeed char to STDOUT
linefeed:
  push  rsi
  push  rdi
  push  rax
  push  rbx
  push  rcx
  push  rdx
  
  mov   rdx, 1
  push  qword 0ah
  mov   rsi, rsp
  mov   rdi, STDOUT
  mov   rax, SYS_WRITE
  syscall
  add   rsp, 8

  pop   rdx
  pop   rcx
  pop   rbx
  pop   rax
  pop   rdi
  pop   rsi
  ret

; Exits the program
; -> rcx : exit code
exit:
  mov   rdi, rcx
  mov   rax, SYS_EXIT
  syscall
  ret

; Puts the program to sleep for n ms;
; rcx -> ms to sleep      (u64)
sleep:
  push  rbx
  push  rdi
  push  rsi

  mov   rax, [rcx + 2 * 8]
  xor   rdx, rdx
  mov   rbx, 1000    ; ms in 1 s
  div   rbx

  mov   qword [ts_sec], rax

  mov   rax, rdx
  mov   rbx, 1000000 ; ns in 1 ms
  mul   rbx

  mov   qword [ts_nsec], rax

  mov   rax, SYS_NANOSLEEP
  mov   rdi, timespec
  mov   rsi, 0
  syscall

  pop   rsi
  pop   rdi
  pop   rbx
  ret