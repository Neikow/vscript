; --------------------------
;     Generated assembly    
; --------------------------

%include	'functions.asm'
%include	'macros.asm'

section .text
global  _start

_start:
	xor		eax, eax
	xor		ebx, ebx
	xor		ecx, ecx
	xor		edx, eax

	mov 	eax, ebp
	call 	iprintLF

	; statement_debug
	; call add
	push	2
	push	1
	push	2
	call	fun_add1
	add		esp, 3 * 4
	mov		eax, eax
	call	iprintLF

	mov 	eax, ebp
	call 	iprintLF


	; exit program with 0 exit code
	mov		ebx, 0
	call	_exit

; fn add(x: int, y: int): int
fun_add1:
	mov 	eax, ebp
	call 	iprintLF
	
	mov		edx, esp

	; let sum
	; x arg
	mov		eax, [edx + 2 * 4]
	mov		ebx, eax
	; y arg
	mov		eax, [edx + 3 * 4]
	mov		eax, eax
	add		eax, ebx
	push	eax
	mov eax, 0
	ret

section .data

section .bss
