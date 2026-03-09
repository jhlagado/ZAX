; ZAX lowered .asm trace
; range: $0100..$207B (end exclusive)

; func word_fvar_glob begin
word_fvar_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
ld hl, (glob_idx_word)         ; 010E: 2A 00 00
push HL                        ; 0111: E5
pop HL                         ; 0112: E1
add HL, HL                     ; 0113: 29
push HL                        ; 0114: E5
ld E, (IX + $0004)             ; 0115: DD 5E 04
ld D, (IX + $0005)             ; 0118: DD 56 05
ex DE, HL                      ; 011B: EB
pop DE                         ; 011C: D1
add HL, DE                     ; 011D: 19
push HL                        ; 011E: E5
pop HL                         ; 011F: E1
pop DE                         ; 0120: D1
pop BC                         ; 0121: C1
pop AF                         ; 0122: F1
push DE                        ; 0123: D5
ld E, (HL)                     ; 0124: 5E
inc HL                         ; 0125: 23
ld D, (HL)                     ; 0126: 56
ld L, E                        ; 0127: 6B
ld H, D                        ; 0128: 62
pop DE                         ; 0129: D1
push DE                        ; 012A: D5
push HL                        ; 012B: E5
ld hl, (glob_idx_word)         ; 012C: 2A 00 00
push HL                        ; 012F: E5
pop HL                         ; 0130: E1
add HL, HL                     ; 0131: 29
push HL                        ; 0132: E5
ld E, (IX + $0004)             ; 0133: DD 5E 04
ld D, (IX + $0005)             ; 0136: DD 56 05
ex DE, HL                      ; 0139: EB
pop DE                         ; 013A: D1
add HL, DE                     ; 013B: 19
push HL                        ; 013C: E5
pop HL                         ; 013D: E1
pop DE                         ; 013E: D1
ld (HL), E                     ; 013F: 73
inc HL                         ; 0140: 23
ld (HL), D                     ; 0141: 72
pop DE                         ; 0142: D1
__zax_epilogue_0:
pop DE                         ; 0143: D1
pop BC                         ; 0144: C1
pop AF                         ; 0145: F1
ld SP, IX                      ; 0146: DD F9
pop IX                         ; 0148: DD E1
ret                            ; 014A: C9
; func main begin
; func word_fvar_glob end
main:
push IX                        ; 014B: DD E5
ld IX, $0000                   ; 014D: DD 21 00 00
add IX, SP                     ; 0151: DD 39
push AF                        ; 0153: F5
push BC                        ; 0154: C5
push DE                        ; 0155: D5
push HL                        ; 0156: E5
ld HL, glob_words              ; 0157: 21 00 00
push HL                        ; 015A: E5
call word_fvar_glob            ; 015B: CD 00 00
inc SP                         ; 015E: 33
inc SP                         ; 015F: 33
__zax_epilogue_1:
pop HL                         ; 0160: E1
pop DE                         ; 0161: D1
pop BC                         ; 0162: C1
pop AF                         ; 0163: F1
ld SP, IX                      ; 0164: DD F9
pop IX                         ; 0166: DD E1
ret                            ; 0168: C9
; func main end

; symbols:
; label word_fvar_glob = $0100
; label __zax_epilogue_0 = $0143
; label main = $014B
; label __zax_epilogue_1 = $0160
; data glob_words = $2000
; data glob_idx_word = $2010
; label __zax_startup = $2012
