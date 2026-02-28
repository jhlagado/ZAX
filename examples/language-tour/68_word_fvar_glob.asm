; ZAX lowered .asm trace
; range: $0100..$2012 (end exclusive)

; func word_fvar_glob begin
word_fvar_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld HL, (glob_idx_word)         ; 010B: 2A 00 00
push HL                        ; 010E: E5
pop HL                         ; 010F: E1
add HL, HL                     ; 0110: 29
push HL                        ; 0111: E5
push DE                        ; 0112: D5
push IX                        ; 0113: DD E5
pop HL                         ; 0115: E1
ld DE, $0004                   ; 0116: 11 04 00
add HL, DE                     ; 0119: 19
pop DE                         ; 011A: D1
pop DE                         ; 011B: D1
add HL, DE                     ; 011C: 19
push HL                        ; 011D: E5
pop HL                         ; 011E: E1
push AF                        ; 011F: F5
ld A, (HL)                     ; 0120: 7E
inc HL                         ; 0121: 23
ld H, (HL)                     ; 0122: 66
ld L, A                        ; 0123: 6F
pop AF                         ; 0124: F1
ld HL, (glob_idx_word)         ; 0125: 2A 00 00
push HL                        ; 0128: E5
pop HL                         ; 0129: E1
add HL, HL                     ; 012A: 29
push HL                        ; 012B: E5
push DE                        ; 012C: D5
push IX                        ; 012D: DD E5
pop HL                         ; 012F: E1
ld DE, $0004                   ; 0130: 11 04 00
add HL, DE                     ; 0133: 19
pop DE                         ; 0134: D1
pop DE                         ; 0135: D1
add HL, DE                     ; 0136: 19
push HL                        ; 0137: E5
pop HL                         ; 0138: E1
ex DE, HL                      ; 0139: EB
ld (hl), e                     ; 013A: 73
inc HL                         ; 013B: 23
ld (hl), d                     ; 013C: 72
ex DE, HL                      ; 013D: EB
__zax_epilogue_0:
pop DE                         ; 013E: D1
pop BC                         ; 013F: C1
pop AF                         ; 0140: F1
ld SP, IX                      ; 0141: DD F9
pop IX                         ; 0143: DD E1
ret                            ; 0145: C9
; func main begin
; func word_fvar_glob end
main:
push IX                        ; 0146: DD E5
ld IX, $0000                   ; 0148: DD 21 00 00
add IX, SP                     ; 014C: DD 39
push AF                        ; 014E: F5
push BC                        ; 014F: C5
push DE                        ; 0150: D5
push HL                        ; 0151: E5
ld HL, glob_words              ; 0152: 21 00 00
push HL                        ; 0155: E5
call word_fvar_glob            ; 0156: CD 00 00
inc SP                         ; 0159: 33
inc SP                         ; 015A: 33
__zax_epilogue_1:
pop HL                         ; 015B: E1
pop DE                         ; 015C: D1
pop BC                         ; 015D: C1
pop AF                         ; 015E: F1
ld SP, IX                      ; 015F: DD F9
pop IX                         ; 0161: DD E1
ret                            ; 0163: C9
; func main end

; symbols:
; label word_fvar_glob = $0100
; label __zax_epilogue_0 = $013E
; label main = $0146
; label __zax_epilogue_1 = $015B
; data glob_words = $2000
; data glob_idx_word = $2010
