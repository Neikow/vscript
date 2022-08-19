SYS_WRITE equ 1
SYS_EXIT  equ 60
STDIN     equ 0
STDOUT    equ 1
STDERR    equ 2

; Prints an integer to STDOUT
; -> rcx : integer
iprint:
  mov  rax, rcx
  push rsi
  xor  rcx, rcx

.divideLoop:
  inc  rcx
  xor  rdx, rdx
  mov  rsi, 10
  idiv rsi
  add  rdx, 48
  push rdx
  cmp  rax, 0
  jnz  .divideLoop
  
  mov  rdx, rcx
  xor  rbx, rbx 

.printLoop:
  dec  rcx
  pop  rax
  mov  byte [output_buffer + rbx], al
  add  rbx, 1
  cmp  rcx, 0
  jnz  .printLoop

  mov  rdx, 10
  mov  rcx, output_buffer
  call sprint

  pop  rsi
  ret

iprintLF:
  call  iprint
  call  linefeed
  ret

; Prints a string to STDOUT
; -> rcx : string base pointer
; -> rdx : string length
sprint:
  push  rdi
  mov   rsi, rcx
	mov   rdi, STDOUT
  mov   rax, SYS_WRITE
  syscall
  pop   rdi
  ret

; Prints a string to STDOUT with line feed
; -> rcx : string base pointer
; -> rdx : string length
sprintLF:
  call  sprint
  call  linefeed
  ret

linefeed:
  push  rsi
  push  rdi
  mov   rdx, 1
  push  qword 0ah
  mov   rsi, rsp
  mov   rdi, STDOUT
  mov   rax, SYS_WRITE
  syscall
  add   rsp, 8
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


memalloc:
  mov		rax, 12   ; get current break
	xor		rdi, rdi
	syscall
  mov   [brk_curr], rax
  mov   [brk_init], rax
  add   rax, rcx
	mov		rdi, rax
	mov		rax, 12
	syscall
  mov   [brk_curr], rax
  ret


