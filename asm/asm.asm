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

	push	10000

while0:
	; condition
	; x var
	mov		eax, [ebp - 2 * 4]
	; mov		eax, eax
	mov		ebx, 0
	cmp		eax, ebx
	je		end_while0
	; body
	; statement_debug (int)
	; x var
	mov		eax, [ebp - 2 * 4]
	; mov		eax, eax
	call	iprintLF
	dec		eax
	mov		[ebp - 2 * 4], eax

	jmp		while0

end_while0:
	mov		ebx, 0	; exit code
	call	_exit

section .data

section .bss
