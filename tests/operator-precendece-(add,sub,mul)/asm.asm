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

	push	2
	push	3
	push	3
	push	12
	pop		eax
	pop		ebx
	sub		eax, ebx
	push	eax
	mov		eax, 
	mul		ebx
	pop		eax
	pop		ebx
	add		eax, ebx
	push	eax

	; statement_debug (tuple)
	mov		eax, _s0
	push	eax
	pop		eax
	call	sprint

	mov		eax, _s1
	push	eax
	pop		eax
	call	sprint

	mov		eax, [ebp - 3 * 4]
	push	eax	; (y)
	pop		eax
	call	iprintLF

	mov		ebx, 0	; exit code
	call	_exit

section .data
_s0: db 'y = 29', 0h
_s1: db ' ', 0h
