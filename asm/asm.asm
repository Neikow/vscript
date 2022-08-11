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
	xor		edx, edx
	mov		ebp, esp	; save program base pointer
	push	ebp

	; op add
	; op mul
	mov		eax, 10
	; op mul
	mov		ebx, 10
	mov		ecx, 10
	mov		eax, ebx
	mul		ecx
	mul		ebx
	; op mul
	mov		ebx, 10
	; op mul
	mov		ecx, 10
	mov		edx, 10
	mov		eax, ecx
	mul		edx
	mov		eax, ebx
	mul		ecx
	add		eax, ebx
	push	eax	; (x)

	; statement_debug (int)
	mov		eax, [ebp - 2 * 4]	; (x)
	call	iprintLF

	mov		ebx, 0	; exit code
	call	_exit
