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
	; lo: 1, go: 1
	push	ebp

	; lo: 2, go: 2
	push	10
	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp - 2 * 4]	; (z)
	call	iprintLF

	mov		ebx, 0	; exit code
	call	_exit

section .data
_s0: db 'z', 0h
_s1: db ', ', 0h

section .bss
