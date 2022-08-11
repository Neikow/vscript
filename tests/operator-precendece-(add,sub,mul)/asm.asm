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
	mov		eax, 3
	; op sub
	mov		ecx, 3
	mov		ebx, 12
	sub		ebx, ecx
	mul		ebx
	mov		ebx, 2
	add		eax, ebx
	push	eax	; (y)

	; statement_debug (tuple)
	mov		eax, _s0
	call	sprint

	mov		eax, _s1
	call	sprint

	mov		eax, [ebp - 2 * 4]	; (y)
	call	iprintLF

	mov		ebx, 0	; exit code
	call	_exit

section .data
_s0: db 'y = 29', 0h
_s1: db ' ', 0h
