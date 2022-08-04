SYS_EXIT  equ 1
SYS_WRITE equ 4
STDIN     equ 0
STDOUT    equ 1

;-------------------------------------------
; void atoi(Integer number)
; Converts Ascii to integer (atoi)
atoi:
  push  ebx
  push  ecx
  push  edx
  push  esi
  mov   esi, eax
  mov   eax, 0
  mov   ecx, 0

.multiplyLoop:
  xor   ebx, ebx
  mov   bl, [esi + ecx]
  cmp   bl, 48
  jl    .finished
  cmp   bl, 57
  jg    .finished

  sub   bl, 48
  add   eax, ebx
  mov   ebx, 10
  mul   ebx
  inc   ecx
  jmp   .multiplyLoop

.finished:
  cmp   ecx, 0
  je    .restore
  mov   ebx,  10
  div   ebx

.restore:
  pop   esi
  pop   edx
  pop   ecx
  pop   ebx
  ret

;-------------------------------------------
; void iprint(Integer number)
; Prints the number to stdout
iprint:
  push  eax
  push  ecx
  push  edx
  push  esi
  mov   ecx, 0

.divideLoop:
  inc   ecx
  mov   edx, 0
  mov   esi, 10
  idiv  esi
  add   edx, 48
  push  edx
  cmp   eax, 0
  jnz   .divideLoop

.printLoop:
  dec   ecx
  mov   eax, esp
  call  sprint
  pop   eax
  cmp   ecx, 0
  jnz   .printLoop

  pop   esi
  pop   edx
  pop   ecx
  pop   eax
  ret

;-------------------------------------------
; void iprintLF(Integer number)
; Prints the number to stdout with linefeed
iprintLF:
  call  iprint
  
  push  eax
  mov   eax, 0ah
  push  eax
  mov   eax, esp
  call  sprint
  pop   eax
  pop   eax
  ret

;-------------------------------------------
; int slen(String message)
; Calculates the length of a string
slen:
  push  ebx
  mov   ebx, eax

.nextChar:
  cmp   byte [eax], 0
  jz    .finished
  inc   eax
  jmp   .nextChar

.finished:
  sub   eax, ebx
  pop   ebx
  ret

;-------------------------------------------
; void sprint(String message)
; Prints the string to stdout
sprint:
  push  edx
  push  ecx
  push  ebx
  push  eax
  call  slen

  mov   edx, eax
  pop   eax

  mov   ecx, eax
  mov   ebx, STDOUT
  mov   eax, SYS_WRITE
  int   80h

  pop   ebx
  pop   ecx
  pop   edx
  ret

;-------------------------------------------
; void sprint(String message)
; Prints the string to stdout with line feed
sprintLF:
  call  sprint

  push  eax
  mov   eax, 0ah
  push  eax
  mov   eax, esp
  call  sprint
  pop   eax
  pop   eax
  ret

;-------------------------------------------
; void exit()
; Exits the program
_exit:
  mov   eax, 1
  int   80h
  ret