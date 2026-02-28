; ZAX lowered .asm trace
; range: $0100..$2010 (end exclusive)

; func word_fvar_const begin
word_fvar_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ex DE, HL                      ; 010B: EB
ld E, (IX + $0008)             ; 010C: DD 5E 08
ld D, (IX + $0009)             ; 010F: DD 56 09
ex DE, HL                      ; 0112: EB
push DE                        ; 0113: D5
push HL                        ; 0114: E5
ld E, (IX + $000A)             ; 0115: DD 5E 0A
ld D, (IX + $000B)             ; 0118: DD 56 0B
ld HL, $0000                   ; 011B: 21 00 00
add HL, HL                     ; 011E: 29
add HL, DE                     ; 011F: 19
pop DE                         ; 0120: D1
ld (HL), E                     ; 0121: 73
inc HL                         ; 0122: 23
ld (HL), D                     ; 0123: 72
pop DE                         ; 0124: D1
__zax_epilogue_0:
pop DE                         ; 0125: D1
pop BC                         ; 0126: C1
pop AF                         ; 0127: F1
ld SP, IX                      ; 0128: DD F9
pop IX                         ; 012A: DD E1
ret                            ; 012C: C9
; func main begin
; func word_fvar_const end
main:
push IX                        ; 012D: DD E5
ld IX, $0000                   ; 012F: DD 21 00 00
add IX, SP                     ; 0133: DD 39
push AF                        ; 0135: F5
push BC                        ; 0136: C5
push DE                        ; 0137: D5
push HL                        ; 0138: E5
ld HL, glob_words              ; 0139: 21 00 00
push HL                        ; 013C: E5
call word_fvar_const           ; 013D: CD 00 00
inc SP                         ; 0140: 33
inc SP                         ; 0141: 33
__zax_epilogue_1:
pop HL                         ; 0142: E1
pop DE                         ; 0143: D1
pop BC                         ; 0144: C1
pop AF                         ; 0145: F1
ld SP, IX                      ; 0146: DD F9
pop IX                         ; 0148: DD E1
ret                            ; 014A: C9
; func main end

; symbols:
; label word_fvar_const = $0100
; label __zax_epilogue_0 = $0125
; label main = $012D
; label __zax_epilogue_1 = $0142
; data glob_words = $2000
