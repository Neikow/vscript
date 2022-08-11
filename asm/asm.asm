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

	mov		eax, 1
	mov		ebx, 2
	mov		ecx, 3
	add		ebx, ecx
	add		eax, ebx
	push	eax	; (x)

	; statement_debug (int)
	mov		eax, [ebp - 2 * 4]	; (x)
	call	iprintLF

	mov		ebx, 0	; exit code
	call	_exit
